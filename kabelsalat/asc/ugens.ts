// these are most core kabelsalat ugens ported to assemblyscript
// the kabelsalat ugens are largely based on noisecraft: https://github.com/maximecb/noisecraft
// license:  GPL-2.0

const SAMPLE_RATE = 44100;
const ISR: f64 = 1 / SAMPLE_RATE;

export const PI: f64 = 3.141592653589793;
export function sin(x: f64): f64 {
  var y: f64, z: f64;
  x *= 1 / PI;
  y = floor(x);
  z = x - y;
  z *= 1.0 - z;
  z *= 3.6 * z + 3.1;
  return select(-z, z, (<i64>y) & 1);
}

export function cos(x: f64): f64 {
  return sin(x + PI * 0.5);
}

function lerp(x: f64, y0: f64, y1: f64): f64 {
  if (x >= 1) return y1;

  return y0 + x * (y1 - y0);
}

export class PulseOsc {
  phase: f64 = 0;
  update(freq: f64, duty: f64 = 0.5): f64 {
    this.phase += ISR * freq;
    let cyclePos = this.phase % 1;
    return cyclePos < duty ? 1 : -1;
  }
}

export class SineOsc {
  phase: f64 = 0;
  update(freq: f64): f64 {
    return sin((this.phase += 2 * PI * freq * ISR));
  }
}

export class TriOsc {
  phase: f64 = 0;
  update(freq: f64): f64 {
    this.phase += ISR * freq;
    let cyclePos = this.phase % 1;
    // Compute a value between 0 and 1
    let normVal = cyclePos < 0.5 ? 2 * cyclePos : 1 - 2 * (cyclePos - 0.5);
    return normVal * 2 - 1;
  }
}

export class SawOsc {
  phase: f64 = 0;
  update(freq: f64): f64 {
    this.phase += ISR * freq;
    return (this.phase % 1) * 2 - 1;
  }
}

export class Dust {
  update(density: f64): f64 {
    return Math.random() < density * ISR ? Math.random() : 0;
  }
}

export class Range {
  update(input: f64, min: f64, max: f64): f64 {
    const uni = (input + 1) * 0.5;
    return uni * (max - min) + min;
  }
}

export class Impulse {
  phase: f64 = 1;
  update(freq: f64): f64 {
    this.phase += ISR * freq;
    let v = this.phase >= 1 ? 1 : 0;
    this.phase = this.phase % 1;
    return v;
  }
}

export class Lpf {
  s0: f64 = 0;
  s1: f64 = 0;
  update(s: f64, cutoff: f64, resonance: f64 = 0): f64 {
    // Out of bound values can produce NaNs
    cutoff = Math.min(cutoff, 1);
    resonance = Math.max(resonance, 0);
    var c: f64 = Math.pow(0.5, (1 - cutoff) / 0.125);
    var r: f64 = Math.pow(0.5, (resonance + 0.125) / 0.125);
    var mrc: f64 = 1 - r * c;
    var v0: f64 = this.s0;
    var v1: f64 = this.s1;
    // Apply the filter to the sample
    v0 = mrc * v0 - c * v1 + c * s;
    v1 = mrc * v1 + c * v0;
    s = v1;
    this.s0 = v0;
    this.s1 = v1;
    return s;
  }
}

export class Delay {
  writeIdx: i32 = 0;
  readIdx: i32 = 0;
  buffer: Float64Array;
  constructor() {
    const MAX_DELAY_TIME: i32 = 4;
    this.buffer = new Float64Array(MAX_DELAY_TIME * SAMPLE_RATE);
  }
  write(s: f64, delayTime: f64): void {
    this.writeIdx = (this.writeIdx + 1) % this.buffer.length;
    this.buffer[this.writeIdx] = s;
    // Calculate how far in the past to read
    let numSamples = Math.min(
      Math.floor(SAMPLE_RATE * delayTime),
      this.buffer.length - 1
    ) as i32;
    this.readIdx = this.writeIdx - numSamples;
    // If past the start of the buffer, wrap around
    if (this.readIdx < 0) this.readIdx += this.buffer.length;
  }
  update(input: f64, delayTime: f64): f64 {
    this.write(input, delayTime);
    return this.buffer[this.readIdx];
  }
}

export class ADSR {
  state: i32 = 0;
  // 0=off 1=attack 2=decay 3=sustain 4=release
  startTime: f64 = 0;
  startVal: f64 = 0;
  update(
    curTime: f64,
    gate: f64,
    attack: f64,
    decay: f64,
    susVal: f64,
    release: f64
  ): f64 {
    switch (this.state) {
      // off
      case 0: {
        if (gate > 0) {
          this.state = 1;
          this.startTime = curTime;
          this.startVal = 0;
        }
        return 0;
      }
      // attack
      case 1: {
        let time = curTime - this.startTime;
        if (time > attack) {
          this.state = 2;
          this.startTime = curTime;
          return 1;
        }
        return lerp(time / attack, this.startVal, 1);
      }
      // decay
      case 2: {
        let time = curTime - this.startTime;
        let curVal = lerp(time / decay, 1, susVal);
        if (gate <= 0) {
          this.state = 4;
          this.startTime = curTime;
          this.startVal = curVal;
          return curVal;
        }
        if (time > decay) {
          this.state = 3;
          this.startTime = curTime;
          return susVal;
        }
        return curVal;
      }
      // sustain
      case 3: {
        if (gate <= 0) {
          this.state = 4;
          this.startTime = curTime;
          this.startVal = susVal;
        }
        return susVal;
      }
      // release
      case 4: {
        let time = curTime - this.startTime;
        if (time > release) {
          this.state = 0;
          return 0;
        }
        let curVal = lerp(time / release, this.startVal, 0);
        if (gate > 0) {
          this.state = 1;
          this.startTime = curTime;
          this.startVal = curVal;
        }
        return curVal;
      }
    }
    return 0;
  }
}

export class Lag {
  lagUnit: i32 = 4410; // 60dB per second (maybe?)
  s: f64 = 0;
  update(input: f64, rate: f64): f64 {
    // Remap so the useful range is around [0, 1]
    rate = rate * this.lagUnit;
    if (rate < 1) rate = 1;
    this.s += (1 / rate) * (input - this.s);
    return this.s;
  }
}

// like Lag, but scaled differently.. this is from NoiseCraft
export class Slide {
  // Current state
  s: f64 = 0;

  update(input: f64, rate: f64): f64 {
    // Remap so the useful range is around [0, 1]
    rate = rate * 1000;
    if (rate < 1) rate = 1;
    this.s += (1 / rate) * (input - this.s);
    return this.s;
  }
}

export class Slew {
  last: f64 = 0;
  update(input: f64, up: f64, dn: f64): f64 {
    const upStep = up * ISR;
    const downStep = dn * ISR;

    let delta = input - this.last;
    if (delta > upStep) {
      delta = upStep;
    } else if (delta < -downStep) {
      delta = -downStep;
    }
    this.last += delta;
    return this.last;
  }
}

export class Fold {
  update(input: f64, rate: f64): f64 {
    if (rate < 0) rate = 0;
    rate = rate + 1;
    input = input * rate;
    return (
      4 *
      (Math.abs(0.25 * input + 0.25 - Math.round(0.25 * input + 0.25)) - 0.25)
    );
  }
}

export class Sequence {
  clockSgn: bool = true;
  step: i32 = 0;
  first: bool = true;
  update(clock: f64, steps: f64[]): f64 {
    if (!this.clockSgn && clock > 0) {
      this.step = (this.step + 1) % steps.length;
      this.clockSgn = clock > 0;
      return 0; // set first sample to zero to retrigger gates on step change...
    }
    this.clockSgn = clock > 0;
    return steps[this.step];
  }
}

export class ClockDiv {
  inSgn: bool = true;
  outSgn: bool = true;
  clockCnt: i32 = 0;
  update(clock: f64, factor: f64): f64 {
    let curSgn = clock > 0;
    // If the input clock sign just flipped
    if (this.inSgn != curSgn) {
      // Count all edges, both rising and falling
      this.clockCnt++;
      // If we've reached the division factor
      // if (this.clockCnt >= factor) // <- og
      if (this.clockCnt >= factor) {
        // Reset the clock count
        this.clockCnt = 0;
        // Flip the output clock sign
        this.outSgn = !this.outSgn;
      }
    }
    this.inSgn = curSgn;
    return this.outSgn ? 1 : -1;
  }
}

export class Distort {
  update(input: f64, amount: f64): f64 {
    amount = Math.min(Math.max(amount, 0), 1);
    amount -= 0.01;
    var k = (2 * amount) / (1 - amount);
    var y = ((1 + k) * input) / (1 + k * Math.abs(input));
    return y;
  }
}

export class Hold {
  // Value currently being held
  value: f64 = 0;
  // Current trig input sign (positive/negative)
  trigSgn: bool = false;

  update(input: f64, trig: f64): f64 {
    if (!this.trigSgn && trig > 0) this.value = input;
    this.trigSgn = trig > 0;
    return this.value;
  }
}

export class Noise {
  update(): f64 {
    return Math.random() * 2 - 1;
  }
}

export class BrownNoise {
  out: f64 = 0;
  update(): f64 {
    let white = Math.random() * 2 - 1;
    this.out = (this.out + 0.02 * white) / 1.02;
    return this.out;
  }
}

export class PinkNoise {
  b0: f64 = 0;
  b1: f64 = 0;
  b2: f64 = 0;
  b3: f64 = 0;
  b4: f64 = 0;
  b5: f64 = 0;
  b6: f64 = 0;
  update(): f64 {
    const white = Math.random() * 2 - 1;
    this.b0 = 0.99886 * this.b0 + white * 0.0555179;
    this.b1 = 0.99332 * this.b1 + white * 0.0750759;
    this.b2 = 0.969 * this.b2 + white * 0.153852;
    this.b3 = 0.8665 * this.b3 + white * 0.3104856;
    this.b4 = 0.55 * this.b4 + white * 0.5329522;
    this.b5 = -0.7616 * this.b5 - white * 0.016898;
    const pink =
      this.b0 +
      this.b1 +
      this.b2 +
      this.b3 +
      this.b4 +
      this.b5 +
      this.b6 +
      white * 0.5362;
    this.b6 = white * 0.115926;
    return pink * 0.11;
  }
}
