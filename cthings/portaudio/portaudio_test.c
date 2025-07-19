// this file has been compiled from kabelsalat, using ks2c-pa
// to build it, you need portaudio on your system
// compile and run on OSX with:
// gcc portaudio_test.c -o portaudio_test -I/opt/homebrew/include -L/opt/homebrew/lib -lportaudio -lm && ./portaudio_test
// gcc portaudio_test.c -o portaudio_test -lportaudio && ./portaudio_test
// this will spit out a self-contained ~34kB binary that plays the compiled kabelsalat patch

#include <stdio.h>
#include <math.h>
#include <string.h>
#include <portaudio.h>
#include <stdint.h>
#ifndef UGENS_H
#define UGENS_H

#include <math.h>
#include <stdlib.h>
#include <stdbool.h>

#define SAMPLE_RATE 44100
#define MAX_DELAY_TIME 10
#define CLOCK_PPQ 24
#define DELAY_BUFFER_LENGTH (MAX_DELAY_TIME * SAMPLE_RATE)
#define SAMPLE_TIME (1.0 / SAMPLE_RATE)
#define MAX(x, y) (((x) > (y)) ? (x) : (y))
#define MIN(x, y) (((x) < (y)) ? (x) : (y))
#define RANDOM_FLOAT ((float)arc4random() / (float)UINT32_MAX) // libbsd
//#define RANDOM_FLOAT ((float)rand() / (float)RAND_MAX) // stdlib
//#define RANDOM_FLOAT ((float)random() / (float)0x7FFFFFFF) // POSIX

// helpers

double lerp(double x, double y0, double y1)
{
  if (x >= 1)
    return y1;
  return y0 + x * (y1 - y0);
}

// a pair of values
// used to implement e.g. argmin and argmax
typedef struct pair {
   double a;
   double b;
} pair;

// SineOsc

typedef struct SineOsc
{
  double phase;
} SineOsc;

void SineOsc_init(SineOsc *osc)
{
  osc->phase = 0.0;
}

double SineOsc_update(SineOsc *osc, double freq, double x, double y)
{
  osc->phase += SAMPLE_TIME * freq;
  if (osc->phase >= 1.0)
    osc->phase -= 1.0; // Keeping phase in [0, 1)
  return sin(osc->phase * 2.0 * M_PI);
}

void *SineOsc_create()
{
  void *osc = malloc(sizeof(SineOsc));
  SineOsc_init((SineOsc *)osc);
  return (void *)osc;
}

// SawOsc

typedef struct SawOsc
{
  double phase;
} SawOsc;

void SawOsc_init(SawOsc *osc)
{
  osc->phase = 0.0;
}

/* double phasor_update(double phase, double freq)
{
  phase += SAMPLE_TIME * freq;
  if (phase >= 1.0)
    phase -= 1.0; // Keeping phase in [0, 1)
  return phase;
} */

double SawOsc_update(SawOsc *osc, double freq)
{
  osc->phase += SAMPLE_TIME * freq;
  if (osc->phase >= 1.0)
    osc->phase -= 1.0; // Keeping phase in [0, 1)
  return (osc->phase) * 2 - 1;
}

void *SawOsc_create()
{
  void *osc = malloc(sizeof(SawOsc));
  SawOsc_init((SawOsc *)osc);
  return (void *)osc;
}

// ADSRNode

// ADSRNode structure and state enumeration
typedef enum
{
  ADSR_OFF,
  ADSR_ATTACK,
  ADSR_DECAY,
  ADSR_SUSTAIN,
  ADSR_RELEASE
} ADSRState;

typedef struct ADSRNode
{
  ADSRState state;
  double startTime;
  double startVal;
} ADSRNode;

void ADSRNode_init(ADSRNode *env)
{
  env->state = ADSR_OFF;
  env->startTime = 0.0;
  env->startVal = 0.0;
}

double ADSRNode_update(ADSRNode *env, double curTime, double gate, double attack, double decay, double susVal, double release)
{
  switch (env->state)
  {
  case ADSR_OFF:
    if (gate > 0)
    {
      env->state = ADSR_ATTACK;
      env->startTime = curTime;
      env->startVal = 0.0;
    }
    return 0.0;

  case ADSR_ATTACK:
  {
    double time = curTime - env->startTime;
    if (time > attack)
    {
      env->state = ADSR_DECAY;
      env->startTime = curTime;
      return 1.0;
    }
    return lerp(time / attack, env->startVal, 1.0);
  }

  case ADSR_DECAY:
  {
    double time = curTime - env->startTime;
    double curVal = lerp(time / decay, 1.0, susVal);

    if (gate <= 0)
    {
      env->state = ADSR_RELEASE;
      env->startTime = curTime;
      env->startVal = curVal;
      return curVal;
    }

    if (time > decay)
    {
      env->state = ADSR_SUSTAIN;
      env->startTime = curTime;
      return susVal;
    }

    return curVal;
  }

  case ADSR_SUSTAIN:
    if (gate <= 0)
    {
      env->state = ADSR_RELEASE;
      env->startTime = curTime;
      env->startVal = susVal;
    }
    return susVal;

  case ADSR_RELEASE:
  {
    double time = curTime - env->startTime;
    if (time > release)
    {
      env->state = ADSR_OFF;
      return 0.0;
    }

    double curVal = lerp(time / release, env->startVal, 0.0);
    if (gate > 0)
    {
      env->state = ADSR_ATTACK;
      env->startTime = curTime;
      env->startVal = curVal;
    }
    return curVal;
  }
  }

  // Fallback case for invalid state
  // fprintf(stderr, "Invalid ADSR state\n");
  return 0.0;
}

void *ADSRNode_create()
{
  ADSRNode *env = (ADSRNode *)malloc(sizeof(ADSRNode));
  ADSRNode_init(env);
  return (void *)env;
}

// Filter

typedef struct Filter
{
  double s0;
  double s1;
} Filter;

void Filter_init(Filter *self)
{
  self->s0 = 0;
  self->s1 = 0;
}

double Filter_update(Filter *self, double input, double cutoff, double resonance)
{

  // Out of bound values can produce NaNs
  cutoff = fmin(cutoff, 1);
  resonance = fmax(resonance, 0);

  double c = pow(0.5, (1 - cutoff) / 0.125);
  double r = pow(0.5, (resonance + 0.125) / 0.125);
  double mrc = 1 - r * c;

  double v0 = self->s0;
  double v1 = self->s1;

  // Apply the filter to the sample
  v0 = mrc * v0 - c * v1 + c * input;
  v1 = mrc * v1 + c * v0;
  double output = v1;

  self->s0 = v0;
  self->s1 = v1;

  return output;
}

void *Filter_create()
{
  Filter *env = (Filter *)malloc(sizeof(Filter));
  Filter_init(env);
  return (void *)env;
}

// ImpulseOsc

typedef struct ImpulseOsc
{
  double phase;
} ImpulseOsc;

void ImpulseOsc_init(ImpulseOsc *self)
{
  self->phase = 1;
}

double ImpulseOsc_update(ImpulseOsc *self, double freq, double phase)
{
  self->phase += SAMPLE_TIME * freq;
  double v = self->phase >= 1 ? 1 : 0;
  if (self->phase >= 1.0)
    self->phase -= 1.0; // Keeping phase in [0, 1)
  return v;
}

void *ImpulseOsc_create()
{
  ImpulseOsc *env = (ImpulseOsc *)malloc(sizeof(ImpulseOsc));
  ImpulseOsc_init(env);
  return (void *)env;
}

// Lag

int lagUnit = 4410;

typedef struct Lag
{
  double s;
} Lag;

void Lag_init(Lag *self)
{
  self->s = 0;
}

double Lag_update(Lag *self, double input, double rate)
{
  // Remap so the useful range is around [0, 1]
  rate = rate * lagUnit;
  if (rate < 1)
    rate = 1;
  self->s += (1 / rate) * (input - self->s);
  return self->s;
}

void *Lag_create()
{
  Lag *env = (Lag *)malloc(sizeof(Lag));
  Lag_init(env);
  return (void *)env;
}

// Delay

typedef struct Delay
{
  int writeIdx;
  int readIdx;
  float buffer[DELAY_BUFFER_LENGTH];
} Delay;

void Delay_init(Delay *self)
{
  // Write and read positions in the buffer
  self->writeIdx = 0;
  self->readIdx = 0;
}

double Delay_update(Delay *self, double input, double time)
{

  self->writeIdx = (self->writeIdx + 1) % DELAY_BUFFER_LENGTH;
  self->buffer[self->writeIdx] = input;

  // Calculate how far in the past to read
  int numSamples = MIN(
      floor(SAMPLE_RATE * time),
      DELAY_BUFFER_LENGTH - 1);

  self->readIdx = self->writeIdx - numSamples;

  // If past the start of the buffer, wrap around
  if (self->readIdx < 0)
    self->readIdx += DELAY_BUFFER_LENGTH;

  return self->buffer[self->readIdx];
}

void *Delay_create()
{
  Delay *node = (Delay *)malloc(sizeof(Delay));
  Delay_init(node);
  return (void *)node;
}

// Output

typedef struct Output
{
  double value;
} Output;

void Output_init(Output *self)
{
  self->value = 0;
}

// TODO: find out what to do with id
double Output_update(Output *self, double value, int id)
{
  self->value = value;
  return self->value;
}

void *Output_create()
{
  Output *node = (Output *)malloc(sizeof(Output));
  Output_init(node);
  return (void *)node;
}

// Fold

typedef struct Fold
{
} Fold;

void Fold_init(Fold *self)
{
}

double Fold_update(Fold *self, double input, double rate)
{
  // Make it so rate 0 means input unaltered because
  // NoiseCraft knobs default to the [0, 1] range
  if (rate < 0)
    rate = 0;
  rate = rate + 1;

  input = input * rate;
  return (
      4 *
      (fabs(0.25 * input + 0.25 - roundf(0.25 * input + 0.25)) - 0.25));
}

void *Fold_create()
{
  Fold *node = (Fold *)malloc(sizeof(Fold));
  Fold_init(node);
  return (void *)node;
}

// BrownNoiseOsc

typedef struct BrownNoiseOsc
{
  float out;
} BrownNoiseOsc;

void BrownNoiseOsc_init(BrownNoiseOsc *self)
{
  self->out = 0;
}

double BrownNoiseOsc_update(BrownNoiseOsc *self)
{
  float white = RANDOM_FLOAT * 2.0 - 1.0;
  self->out = (self->out + 0.02 * white) / 1.02;
  return self->out;
}

void *BrownNoiseOsc_create()
{
  BrownNoiseOsc *node = (BrownNoiseOsc *)malloc(sizeof(BrownNoiseOsc));
  BrownNoiseOsc_init(node);
  return (void *)node;
}

// PinkNoise

typedef struct PinkNoise
{
  float b0;
  float b1;
  float b2;
  float b3;
  float b4;
  float b5;
  float b6;
} PinkNoise;

void PinkNoise_init(PinkNoise *self)
{

  self->b0 = 0;
  self->b1 = 0;
  self->b2 = 0;
  self->b3 = 0;
  self->b4 = 0;
  self->b5 = 0;
  self->b6 = 0;
}

double PinkNoise_update(PinkNoise *self)
{

  float white = RANDOM_FLOAT * 2 - 1;

  self->b0 = 0.99886 * self->b0 + white * 0.0555179;
  self->b1 = 0.99332 * self->b1 + white * 0.0750759;
  self->b2 = 0.969 * self->b2 + white * 0.153852;
  self->b3 = 0.8665 * self->b3 + white * 0.3104856;
  self->b4 = 0.55 * self->b4 + white * 0.5329522;
  self->b5 = -0.7616 * self->b5 - white * 0.016898;

  float pink =
      self->b0 +
      self->b1 +
      self->b2 +
      self->b3 +
      self->b4 +
      self->b5 +
      self->b6 +
      white * 0.5362;
  self->b6 = white * 0.115926;

  return pink * 0.11;
}

void *PinkNoise_create()
{
  PinkNoise *node = (PinkNoise *)malloc(sizeof(PinkNoise));
  PinkNoise_init(node);
  return (void *)node;
}

// NoiseOsc

typedef struct NoiseOsc
{
} NoiseOsc;

void NoiseOsc_init(NoiseOsc *self)
{
}

double NoiseOsc_update(NoiseOsc *self)
{
  return RANDOM_FLOAT * 2 - 1;
}

void *NoiseOsc_create()
{
  NoiseOsc *node = (NoiseOsc *)malloc(sizeof(NoiseOsc));
  NoiseOsc_init(node);
  return (void *)node;
}

// DustOsc

typedef struct DustOsc
{
} DustOsc;

double DustOsc_update(DustOsc *self, float density)
{
  return RANDOM_FLOAT < density * SAMPLE_TIME ? RANDOM_FLOAT : 0;
}

void *DustOsc_create()
{
  DustOsc *node = (DustOsc *)malloc(sizeof(DustOsc));
  return (void *)node;
}

// ClockDiv

typedef struct ClockDiv
{
  // Last clock sign at the input (positive/negative)
  bool inSgn;
  // Current clock sign at the output (positive/negative)
  // We start high to trigger immediately upon starting,
  // just like the Clock node
  bool outSgn;
  int clockCnt;

} ClockDiv;

void ClockDiv_init(ClockDiv *self)
{
  self->inSgn = true;
  self->outSgn = true;
  self->clockCnt = 0;
}

double ClockDiv_update(ClockDiv *self, float clock, float factor)
{

  // Current clock sign at the input
  bool curSgn = clock > 0;

  // If the input clock sign just flipped
  if (self->inSgn != curSgn)
  {
    // Count all edges, both rising and falling
    self->clockCnt++;

    // If we've reached the division factor
    // if (self->clockCnt >= factor) // <- og
    if (self->clockCnt >= factor)
    {
      // Reset the clock count
      self->clockCnt = 0;

      // Flip the output clock sign
      self->outSgn = !self->outSgn;
    }
  }

  self->inSgn = curSgn;

  return self->outSgn ? 1 : 0;
}

void *ClockDiv_create()
{
  ClockDiv *node = (ClockDiv *)malloc(sizeof(ClockDiv));
  ClockDiv_init(node);
  return (void *)node;
}

// Distort

typedef struct Distort
{
} Distort;

double Distort_update(Distort *self, float input, float amount)
{
  amount = MIN(MAX(amount, 0), 1);
  amount -= 0.01;

  float k = (2 * amount) / (1 - amount);
  float y = ((1 + k) * input) / (1 + k * fabs(input));
  return y;
}

void *Distort_create()
{
  Distort *node = (Distort *)malloc(sizeof(Distort));
  return (void *)node;
}

// Hold

typedef struct Hold
{
  float value;
  bool trigSgn;
} Hold;

void Hold_init(Hold *self)
{
  self->value = 0;
  self->trigSgn = false;
}

double Hold_update(Hold *self, float input, float trig)
{
  if (!self->trigSgn && trig > 0)
    self->value = input;

  self->trigSgn = trig > 0;
  return self->value;
}

void *Hold_create()
{
  Hold *node = (Hold *)malloc(sizeof(Hold));
  Hold_init(node);
  return (void *)node;
}

// PulseOsc

typedef struct PulseOsc
{
  float phase;
} PulseOsc;

void PulseOsc_init(PulseOsc *self)
{
  self->phase = 0;
}

double PulseOsc_update(PulseOsc *self, float freq, float duty)
{

  self->phase += SAMPLE_TIME * freq;
  if (self->phase >= 1.0)
    self->phase -= 1.0; // Keeping phase in [0, 1)

  return self->phase < duty ? 1 : -1;
}

void *PulseOsc_create()
{
  PulseOsc *node = (PulseOsc *)malloc(sizeof(PulseOsc));
  PulseOsc_init(node);
  return (void *)node;
}

// TriOsc

typedef struct TriOsc
{
  float phase;
} TriOsc;

void TriOsc_init(TriOsc *self)
{
  self->phase = 0;
}

double TriOsc_update(TriOsc *self, float freq)
{
  self->phase += SAMPLE_TIME * freq;
  if (self->phase >= 1.0)
    self->phase -= 1.0; // Keeping phase in [0, 1)
  return self->phase < 0.5 ? 2 * self->phase : 1 - 2 * (self->phase - 0.5);
}

void *TriOsc_create()
{
  TriOsc *node = (TriOsc *)malloc(sizeof(TriOsc));
  TriOsc_init(node);
  return (void *)node;
}

// Slew

typedef struct Slew
{
  float last;
} Slew;

void Slew_init(Slew *self)
{
  self->last = 0;
}

double Slew_update(Slew *self, float input, float up, float dn)
{
  float upStep = up * SAMPLE_TIME;
  float downStep = dn * SAMPLE_TIME;

  float delta = input - self->last;
  if (delta > upStep)
  {
    delta = upStep;
  }
  else if (delta < -downStep)
  {
    delta = -downStep;
  }
  self->last += delta;
  return self->last;
}

void *Slew_create()
{
  Slew *node = (Slew *)malloc(sizeof(Slew));
  Slew_init(node);
  return (void *)node;
}

// Sequence

typedef struct Sequence
{
  bool clockSgn;
  int step;
  int steps;
  float *sequence;
  bool first;
} Sequence;

void Sequence_init(Sequence *self)
{
  self->clockSgn = true;
  self->step = 0;
  self->first = true;
}

double Sequence_update(Sequence *self, float clock, int len, float *sequence)
{

  if (!self->clockSgn && clock > 0)
  {
    self->step = (self->step + 1);
    if (self->step >= len)
      self->step -= len;
    self->clockSgn = clock > 0;
    return 0; // set first sample to zero to retrigger gates on step change...
  }
  self->clockSgn = clock > 0;
  return sequence[self->step];
}

void *Sequence_create()
{
  Sequence *node = (Sequence *)malloc(sizeof(Sequence));
  Sequence_init(node);
  return (void *)node;
}

// Slide

typedef struct Slide
{
  double s;
} Slide;

void Slide_init(Slide *self)
{
  self->s = 0;
}

double Slide_update(Slide *self, double input, double rate)
{
  rate = rate * 1000;
  if (rate < 1)
    rate = 1;
  self->s += (1 / rate) * (input - self->s);
  return self->s;
}

void *Slide_create()
{
  Slide *env = (Slide *)malloc(sizeof(Slide));
  Slide_init(env);
  return (void *)env;
}

// Clock

typedef struct Clock
{
  float phase;
} Clock;

void Clock_init(Clock *self)
{
  self->phase = 0;
}

double Clock_update(Clock *self, float bpm)
{
  float freq = (CLOCK_PPQ * bpm) / 60;
  float duty = 0.5;
  self->phase += SAMPLE_TIME * freq;
  if (self->phase >= 1)
    self->phase -= 1;

  // Note that the clock starts high so that it will
  // trigger immediately upon starting
  return self->phase < duty ? 1 : -1;
}

void *Clock_create()
{
  Clock *node = (Clock *)malloc(sizeof(Clock));
  Clock_init(node);
  return (void *)node;
}

// Pick

typedef struct Pick {} Pick;

void Pick_init(Pick *self)
{
}

double Pick_update(Sequence *self, float index, int len, float *inputs)
{
    return inputs[((int) floor(index)) % len];
}

void *Pick_create()
{
  Pick *node = (Pick *)malloc(sizeof(Pick));
  Pick_init(node);
  return (void *)node;
}

#endif // UGENS_H

/*

- [x] ADSRNode
- [-] AudioIn
- [x] BrownNoiseOsc
- [-] CC
- [-] Clock
- [x] ClockDiv
- [-] ClockOut
- [x] Delay
- [x] Distort
- [x] DustOsc
- [x] Feedback
- [x] Filter
- [x] Fold
- [x] Hold
- [x] ImpulseOsc
- [x] Lag
- [-] MidiCC
- [-] MidiFreq
- [-] MidiGate
- [-] MidiIn
- [x] NoiseOsc
- [x] PinkNoise
- [x] PulseOsc
- [x] SawOsc
- [x] Sequence
- [x] SineOsc
- [x] Slew
- [x] Slide
- [x] TriOsc
- [ ] Output

*/

/*

// Template

typedef struct Template
{
} Template;

void Template_init(Template *self)
{
}

double Template_update(Template *self)
{
}

void *Template_create()
{
  Template *node = (Template *)malloc(sizeof(Template));
  Template_init(node);
  return (void *)node;
}

*/


#define SAMPLE_RATE 44100     
#define FRAMES_PER_BUFFER 256
#define SAMPLE_TIME (1.0 / SAMPLE_RATE)

typedef struct
{
  double time;
  float* r;
  float* o;
  int osize;
  float* s;
  void** nodes; // wtf am i doing
} CallbackEnv;

static int DSPCallback(const void *inputBuffer, void *outputBuffer,
                            unsigned long framesPerBuffer,
                            const PaStreamCallbackTimeInfo *timeInfo,
                            PaStreamCallbackFlags statusFlags,
                            void *userData)
{
  CallbackEnv *env = (CallbackEnv *)userData;
  float *out = (float *)outputBuffer;

  void **nodes = env->nodes;

  float *o = env->o;
  float *r = env->r;
  float *s = env->s;
  

  for (unsigned long i = 0; i < framesPerBuffer; i++)
  {

    double time = env->time;
    memset(o, 0, env->osize); // reset outputs

// start of autogenerated callback
r[1] = SineOsc_update(nodes[0],0.1,0,0); /* SineOsc */
r[3] = r[1] + 1;
r[5] = r[3] / 2;
r[7] = log(5);
r[9] = log(1);
r[10] = r[7] - r[9];
r[11] = r[5] * r[10];
r[12] = r[11] + r[9];
r[13] = exp(r[12]);
r[14] = DustOsc_update(nodes[1],r[13]); /* DustOsc */
r[17] = SineOsc_update(nodes[2],11.23,0,0); /* SineOsc */
r[19] = r[17] + 1;
r[21] = r[19] / 2;
r[23] = log(0.2);
r[25] = log(0.07);
r[26] = r[23] - r[25];
r[27] = r[21] * r[26];
r[28] = r[27] + r[25];
r[29] = exp(r[28]);
r[31] = ADSRNode_update(nodes[3],time,r[14],0.001,r[29],0,r[29]); /* ADSRNode */
r[41] = Sequence_update(nodes[4], r[14], 9, (float[9]){52,57,60,59,45,52,59,45,57}); /* Sequence */
r[48] = Sequence_update(nodes[5], r[14], 6, (float[6]){12,12,24,12,12,12}); /* Sequence */
r[49] = r[41] + r[48];
r[50] = pow(2.0, ((r[49] - 69.0) / 12.0)) * 440.0;
r[54] = ADSRNode_update(nodes[6],time,r[14],0.001,0.03,0,0.03); /* ADSRNode */
r[56] = r[54] * 2;
r[58] = r[56] - 1;
r[60] = r[58] + 1;
r[62] = r[60] / 2;
r[63] = NoiseOsc_update(nodes[7]); /* NoiseOsc */
r[64] = Hold_update(nodes[8],r[63],r[14]); /* Hold */
r[66] = r[64] + 1;
r[68] = r[66] / 2;
r[70] = log(2);
r[72] = log(0.5);
r[73] = r[70] - r[72];
r[74] = r[68] * r[73];
r[75] = r[74] + r[72];
r[76] = exp(r[75]);
r[77] = log(r[76]);
r[79] = log(1);
r[80] = r[77] - r[79];
r[81] = r[62] * r[80];
r[82] = r[81] + r[79];
r[83] = exp(r[82]);
r[84] = r[50] * r[83];
r[85] = SineOsc_update(nodes[9],r[84],0,0); /* SineOsc */
r[86] = NoiseOsc_update(nodes[10]); /* NoiseOsc */
r[87] = Hold_update(nodes[11],r[86],r[14]); /* Hold */
r[89] = Lag_update(nodes[12],r[87],0.001); /* Lag */
r[92] = ((r[89] + 1) * 0.5) * (1 - 0.2) + 0.2;
r[93] = r[85] * r[92];
r[94] = NoiseOsc_update(nodes[13]); /* NoiseOsc */
r[95] = Hold_update(nodes[14],r[94],r[14]); /* Hold */
r[97] = Lag_update(nodes[15],r[95],0.003); /* Lag */
r[99] = r[97] * 0.8;
r[101] = r[99] + 1;
r[104] = r[101] * 3.141592653589793 * 0.25;
r[105] = cos(r[104]);
r[106] = r[93] * r[105];
r[107] = r[31] * r[106];
r[109] = SineOsc_update(nodes[16],0.121,0,0); /* SineOsc */
r[111] = r[109] + 1;
r[113] = r[111] / 2;
r[115] = log(0.347);
r[117] = log(0.333);
r[118] = r[115] - r[117];
r[119] = r[113] * r[118];
r[120] = r[119] + r[117];
r[121] = exp(r[120]);
r[122] = Delay_update(nodes[17],r[138],r[121]); /* Delay */
r[124] = SineOsc_update(nodes[18],0.54,0,0); /* SineOsc */
r[126] = r[124] + 1;
r[128] = r[126] / 2;
r[130] = log(0.7);
r[132] = log(0.3);
r[133] = r[130] - r[132];
r[134] = r[128] * r[133];
r[135] = r[134] + r[132];
r[136] = exp(r[135]);
r[137] = r[122] * r[136];
r[138] = r[107] + r[137];
r[140] = SineOsc_update(nodes[19],0.131,0,0); /* SineOsc */
r[142] = r[140] + 1;
r[144] = r[142] / 2;
r[146] = log(0.557);
r[148] = log(0.543);
r[149] = r[146] - r[148];
r[150] = r[144] * r[149];
r[151] = r[150] + r[148];
r[152] = exp(r[151]);
r[153] = Delay_update(nodes[20],r[169],r[152]); /* Delay */
r[155] = SineOsc_update(nodes[21],0.64,0,0); /* SineOsc */
r[157] = r[155] + 1;
r[159] = r[157] / 2;
r[161] = log(0.7);
r[163] = log(0.3);
r[164] = r[161] - r[163];
r[165] = r[159] * r[164];
r[166] = r[165] + r[163];
r[167] = exp(r[166]);
r[168] = r[153] * r[167];
r[169] = r[138] + r[168];
r[171] = r[169] * 1.05;
r[172] = NoiseOsc_update(nodes[22]); /* NoiseOsc */
r[174] = DustOsc_update(nodes[23],18); /* DustOsc */
r[178] = ADSRNode_update(nodes[24],time,r[174],0.003,0.05,0,0.05); /* ADSRNode */
r[180] = r[178] * 2;
r[182] = r[180] - 1;
r[184] = r[182] + 1;
r[186] = r[184] / 2;
r[188] = log(1);
r[190] = log(0.6);
r[191] = r[188] - r[190];
r[192] = r[186] * r[191];
r[193] = r[192] + r[190];
r[194] = exp(r[193]);
r[195] = r[172] * r[194];
r[196] = NoiseOsc_update(nodes[25]); /* NoiseOsc */
r[198] = DustOsc_update(nodes[26],500); /* DustOsc */
r[199] = Hold_update(nodes[27],r[196],r[198]); /* Hold */
r[200] = r[195] + r[199];
r[201] = NoiseOsc_update(nodes[28]); /* NoiseOsc */
r[203] = ImpulseOsc_update(nodes[29],0.7,0); /* ImpulseOsc */
r[204] = Hold_update(nodes[30],r[201],r[203]); /* Hold */
r[205] = Slew_update(nodes[31],r[204],0.7,1); /* Slew */
r[207] = r[205] + 1;
r[209] = r[207] / 2;
r[211] = log(1);
r[213] = log(0.4);
r[214] = r[211] - r[213];
r[215] = r[209] * r[214];
r[216] = r[215] + r[213];
r[217] = exp(r[216]);
r[218] = r[200] * r[217];
r[220] = Distort_update(nodes[32],r[218],0.5); /* Distort */
r[221] = NoiseOsc_update(nodes[33]); /* NoiseOsc */
r[223] = ImpulseOsc_update(nodes[34],0.2,0); /* ImpulseOsc */
r[224] = Hold_update(nodes[35],r[221],r[223]); /* Hold */
r[225] = Slew_update(nodes[36],r[224],0.2,1); /* Slew */
r[227] = r[225] + 1;
r[229] = r[227] / 2;
r[231] = log(0.9);
r[233] = log(0.5);
r[234] = r[231] - r[233];
r[235] = r[229] * r[234];
r[236] = r[235] + r[233];
r[237] = exp(r[236]);
r[239] = Filter_update(nodes[37],r[220],r[237],0.2); /* Filter */
r[240] = NoiseOsc_update(nodes[38]); /* NoiseOsc */
r[242] = ImpulseOsc_update(nodes[39],0.33,0); /* ImpulseOsc */
r[243] = Hold_update(nodes[40],r[240],r[242]); /* Hold */
r[244] = Slew_update(nodes[41],r[243],0.33,1); /* Slew */
r[246] = r[244] + 1;
r[248] = r[246] / 2;
r[250] = log(0.4);
r[252] = log(0.3);
r[253] = r[250] - r[252];
r[254] = r[248] * r[253];
r[255] = r[254] + r[252];
r[256] = exp(r[255]);
r[258] = Filter_update(nodes[42],r[239],r[256],0); /* Filter */
r[259] = r[239] - r[258];
r[261] = SineOsc_update(nodes[43],0.12,0,0); /* SineOsc */
r[263] = r[261] * 0.7;
r[265] = r[263] + 1;
r[267] = r[265] * 3.141592653589793 * 0.25;
r[268] = cos(r[267]);
r[269] = r[259] * r[268];
r[271] = Delay_update(nodes[44],r[274],0.65); /* Delay */
r[273] = r[271] * 0.72;
r[274] = r[269] + r[273];
r[276] = r[274] * 0.2;
r[278] = pow(2.0, ((45 - 69.0) / 12.0)) * 440.0;
r[279] = SineOsc_update(nodes[45],r[278],0,0); /* SineOsc */
r[283] = SineOsc_update(nodes[46],0,0,0); /* SineOsc */
r[285] = r[283] + 1;
r[287] = r[285] / 2;
r[288] = r[279] * r[287];
r[292] = SineOsc_update(nodes[47],1,0,0); /* SineOsc */
r[294] = r[292] * 0.6;
r[296] = r[294] + 1;
r[298] = r[296] * 3.141592653589793 * 0.25;
r[299] = cos(r[298]);
r[300] = r[288] * r[299];
r[302] = pow(2.0, ((52 - 69.0) / 12.0)) * 440.0;
r[303] = SineOsc_update(nodes[48],r[302],0,0); /* SineOsc */
r[307] = SineOsc_update(nodes[49],0.28,0,1.5707963267948966); /* SineOsc */
r[309] = r[307] + 1;
r[311] = r[309] / 2;
r[312] = r[303] * r[311];
r[316] = SineOsc_update(nodes[50],1,0,1.5707963267948966); /* SineOsc */
r[318] = r[316] * 0.6;
r[320] = r[318] + 1;
r[322] = r[320] * 3.141592653589793 * 0.25;
r[323] = cos(r[322]);
r[324] = r[312] * r[323];
r[326] = pow(2.0, ((55 - 69.0) / 12.0)) * 440.0;
r[327] = SineOsc_update(nodes[51],r[326],0,0); /* SineOsc */
r[331] = SineOsc_update(nodes[52],0.4,0,3.141592653589793); /* SineOsc */
r[333] = r[331] + 1;
r[335] = r[333] / 2;
r[336] = r[327] * r[335];
r[340] = SineOsc_update(nodes[53],1,0,3.141592653589793); /* SineOsc */
r[342] = r[340] * 0.6;
r[344] = r[342] + 1;
r[346] = r[344] * 3.141592653589793 * 0.25;
r[347] = cos(r[346]);
r[348] = r[336] * r[347];
r[350] = pow(2.0, ((57 - 69.0) / 12.0)) * 440.0;
r[351] = SineOsc_update(nodes[54],r[350],0,0); /* SineOsc */
r[355] = SineOsc_update(nodes[55],0.48,0,4.71238898038469); /* SineOsc */
r[357] = r[355] + 1;
r[359] = r[357] / 2;
r[360] = r[351] * r[359];
r[364] = SineOsc_update(nodes[56],1,0,4.71238898038469); /* SineOsc */
r[366] = r[364] * 0.6;
r[368] = r[366] + 1;
r[370] = r[368] * 3.141592653589793 * 0.25;
r[371] = cos(r[370]);
r[372] = r[360] * r[371];
r[373] = r[300] + r[324] + r[348] + r[372];
r[375] = r[373] * 0.8;
r[376] = r[171] + r[276] + r[375];
o[0] = o[0] + r[376]; /* + output 0 */
s[0] = o[0]; /* write source 0 */
r[379] = sin(r[104]);
r[380] = r[93] * r[379];
r[381] = r[31] * r[380];
r[383] = SineOsc_update(nodes[58],0.121,0,0); /* SineOsc */
r[385] = r[383] + 1;
r[387] = r[385] / 2;
r[389] = log(0.347);
r[391] = log(0.333);
r[392] = r[389] - r[391];
r[393] = r[387] * r[392];
r[394] = r[393] + r[391];
r[395] = exp(r[394]);
r[396] = Delay_update(nodes[59],r[412],r[395]); /* Delay */
r[398] = SineOsc_update(nodes[60],0.54,0,0); /* SineOsc */
r[400] = r[398] + 1;
r[402] = r[400] / 2;
r[404] = log(0.7);
r[406] = log(0.3);
r[407] = r[404] - r[406];
r[408] = r[402] * r[407];
r[409] = r[408] + r[406];
r[410] = exp(r[409]);
r[411] = r[396] * r[410];
r[412] = r[381] + r[411];
r[414] = SineOsc_update(nodes[61],0.131,0,0); /* SineOsc */
r[416] = r[414] + 1;
r[418] = r[416] / 2;
r[420] = log(0.557);
r[422] = log(0.543);
r[423] = r[420] - r[422];
r[424] = r[418] * r[423];
r[425] = r[424] + r[422];
r[426] = exp(r[425]);
r[427] = Delay_update(nodes[62],r[443],r[426]); /* Delay */
r[429] = SineOsc_update(nodes[63],0.64,0,0); /* SineOsc */
r[431] = r[429] + 1;
r[433] = r[431] / 2;
r[435] = log(0.7);
r[437] = log(0.3);
r[438] = r[435] - r[437];
r[439] = r[433] * r[438];
r[440] = r[439] + r[437];
r[441] = exp(r[440]);
r[442] = r[427] * r[441];
r[443] = r[412] + r[442];
r[445] = r[443] * 1.05;
r[446] = sin(r[267]);
r[447] = r[259] * r[446];
r[449] = Delay_update(nodes[64],r[452],0.65); /* Delay */
r[451] = r[449] * 0.72;
r[452] = r[447] + r[451];
r[454] = r[452] * 0.2;
r[455] = sin(r[298]);
r[456] = r[288] * r[455];
r[457] = sin(r[322]);
r[458] = r[312] * r[457];
r[459] = sin(r[346]);
r[460] = r[336] * r[459];
r[461] = sin(r[370]);
r[462] = r[360] * r[461];
r[463] = r[456] + r[458] + r[460] + r[462];
r[465] = r[463] * 0.8;
r[466] = r[445] + r[454] + r[465];
o[1] = o[1] + r[466]; /* + output 1 */
s[1] = o[1]; /* write source 1 */
// end of autogenerated callback

    float left = o[0];
    float right = o[1];

    *out++ = left*.3; 
    *out++ = right*.3;
    env->time += SAMPLE_TIME;
  }
  return paContinue;
}

int main()
{
  PaError err;
  PaStream *stream;


  float o[16] = {0}; // output registry
  float s[16] = {0}; // source registry

  // start of autogenerated init
float r[470] = {0}; // node registry
void *nodes[66];
nodes[0] = SineOsc_create();
nodes[1] = DustOsc_create();
nodes[2] = SineOsc_create();
nodes[3] = ADSRNode_create();
nodes[4] = Sequence_create();
nodes[5] = Sequence_create();
nodes[6] = ADSRNode_create();
nodes[7] = NoiseOsc_create();
nodes[8] = Hold_create();
nodes[9] = SineOsc_create();
nodes[10] = NoiseOsc_create();
nodes[11] = Hold_create();
nodes[12] = Lag_create();
nodes[13] = NoiseOsc_create();
nodes[14] = Hold_create();
nodes[15] = Lag_create();
nodes[16] = SineOsc_create();
nodes[17] = Delay_create();
nodes[18] = SineOsc_create();
nodes[19] = SineOsc_create();
nodes[20] = Delay_create();
nodes[21] = SineOsc_create();
nodes[22] = NoiseOsc_create();
nodes[23] = DustOsc_create();
nodes[24] = ADSRNode_create();
nodes[25] = NoiseOsc_create();
nodes[26] = DustOsc_create();
nodes[27] = Hold_create();
nodes[28] = NoiseOsc_create();
nodes[29] = ImpulseOsc_create();
nodes[30] = Hold_create();
nodes[31] = Slew_create();
nodes[32] = Distort_create();
nodes[33] = NoiseOsc_create();
nodes[34] = ImpulseOsc_create();
nodes[35] = Hold_create();
nodes[36] = Slew_create();
nodes[37] = Filter_create();
nodes[38] = NoiseOsc_create();
nodes[39] = ImpulseOsc_create();
nodes[40] = Hold_create();
nodes[41] = Slew_create();
nodes[42] = Filter_create();
nodes[43] = SineOsc_create();
nodes[44] = Delay_create();
nodes[45] = SineOsc_create();
nodes[46] = SineOsc_create();
nodes[47] = SineOsc_create();
nodes[48] = SineOsc_create();
nodes[49] = SineOsc_create();
nodes[50] = SineOsc_create();
nodes[51] = SineOsc_create();
nodes[52] = SineOsc_create();
nodes[53] = SineOsc_create();
nodes[54] = SineOsc_create();
nodes[55] = SineOsc_create();
nodes[56] = SineOsc_create();
nodes[57] = Output_create();
nodes[58] = SineOsc_create();
nodes[59] = Delay_create();
nodes[60] = SineOsc_create();
nodes[61] = SineOsc_create();
nodes[62] = Delay_create();
nodes[63] = SineOsc_create();
nodes[64] = Delay_create();
nodes[65] = Output_create();

// end of autogenerated init

  CallbackEnv env;
  env.nodes = nodes;
  env.r = (float *)r;
  env.o = (float *)o;
  env.osize = sizeof(o);
  env.s = (float *)s;
  env.time = 0;

  err = Pa_Initialize();
  if (err != paNoError)
  {
    fprintf(stderr, "PortAudio error: %s\n", Pa_GetErrorText(err));
    return 1;
  }

  err = Pa_OpenDefaultStream(&stream,
                             0,         // input channels
                             2,         // output channels
                             paFloat32,
                             SAMPLE_RATE,
                             FRAMES_PER_BUFFER,
                             DSPCallback,
                             &env);
  if (err != paNoError)
  {
    fprintf(stderr, "PortAudio error: %s\n", Pa_GetErrorText(err));
    Pa_Terminate();
    return 1;
  }

  err = Pa_StartStream(stream);
  if (err != paNoError)
  {
    fprintf(stderr, "PortAudio error: %s\n", Pa_GetErrorText(err));
    Pa_Terminate();
    return 1;
  }

  printf("Playing kabelsalat patch. Press Enter to stop...\n");
  getchar();

  err = Pa_StopStream(stream);
  if (err != paNoError)
  {
    fprintf(stderr, "PortAudio error: %s\n", Pa_GetErrorText(err));
  }

  err = Pa_CloseStream(stream);
  if (err != paNoError)
  {
    fprintf(stderr, "PortAudio error: %s\n", Pa_GetErrorText(err));
  }

  Pa_Terminate();

  printf("playback stopped.\n");
  return 0;
}
