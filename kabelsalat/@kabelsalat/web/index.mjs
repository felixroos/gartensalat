function M(e, t) {
  if (t || (t = "assertion failed"), !e)
    throw new Error(t);
}
class u {
  constructor(t, i) {
    this.type = t, i !== void 0 && (this.value = i), this.ins = [];
  }
  static parseInput(t, i) {
    if (typeof t == "function") {
      if (!i)
        throw new Error(
          "tried to parse function input without without passing node.."
        );
      return t(i);
    }
    return typeof t == "object" ? t : typeof t == "number" && !isNaN(t) || typeof t == "string" ? g(t) : (console.log(
      `invalid input type "${typeof t}" for node of type "${i.type}", falling back to 0. The input was:`,
      t
    ), 0);
  }
}
const $ = (e, t) => new u(e, t);
let m = /* @__PURE__ */ new Map();
const b = "poly", q = "exit";
u.prototype.inherit = function(e) {
  return e.inputOf && (this.inputOf = e.inputOf), e.outputOf && (this.outputOf = e.outputOf), this;
};
u.prototype.toObject = function() {
  return JSON.parse(JSON.stringify(this));
};
u.prototype.stringify = function() {
  return JSON.stringify(this, null, 2).replaceAll('"', "'");
};
function B(e, ...t) {
  let i = 1;
  if (t = t.map((s) => {
    if (Array.isArray(s)) {
      if (s.length === 1)
        return s[0];
      s = new u(b).withIns(...s);
    }
    if (typeof s == "function") {
      const r = s(new u("peek"));
      r.type === b && (i = Math.max(r.ins.length, i));
    }
    return s.type === b && (i = Math.max(s.ins.length, i)), s;
  }), i === 1) {
    const s = $(e);
    return s.withIns(...t.map((r) => u.parseInput(r, s)));
  }
  if (e === q) {
    const s = t.map((r) => r.type === b ? r.ins.map((l) => u.parseInput(l).inherit(l)) : r).flat();
    return $(q).withIns(...s);
  }
  const n = Array.from({ length: i }, (s, r) => {
    const l = new u(e), x = t.map((d) => d.type === b ? u.parseInput(d.ins[r % d.ins.length], l).inherit(d) : (d = u.parseInput(d, l), d.type === b && (d = d.ins[r]), d));
    return l.withIns(...x);
  });
  return new u(b).withIns(...n);
}
function oe(e, t) {
  const i = m.get(e);
  return i?.ins?.[t] ? i.ins[t].name : "";
}
let a = (e, t) => y(e, (...i) => B(e, ...i), t);
m.set("register", {
  tags: ["meta"],
  graph: !1,
  description: "Registers a new Node function. Sets it on the prototype + returns the function itself. Like `module` but doesn't hide complexity in graph viz.",
  examples: [
    `let kick = register('kick', gate => gate.adsr(0,.11,0,.11)
.apply(env => env.mul(env)
  .mul(158)
  .sine(env)
  .distort(.85)
))
impulse(2).kick().out()`
  ]
});
let y = (e, t, i) => (i && m.set(e, i), u.prototype[e] = function(...n) {
  return t(this, ...n);
}, t);
m.set("module", {
  tags: ["meta"],
  graph: !0,
  description: "Creates a module. Like `register`, but the graph viz will hide the internal complexity of the module.",
  examples: [
    `let kick = module('kick', gate => gate.adsr(0,.11,0,.11)
.apply(env => env.mul(env)
  .mul(158)
  .sine(env)
  .distort(.85)
))
impulse(2).kick().out()`
  ]
});
let ae = 0;
function h(e, t, i) {
  return y(
    e,
    (...n) => {
      const s = ae++;
      return n = n.map(
        (r, l) => u.parseInput(r).asModuleInput?.(e, s, l)
      ), t(...n).asModuleOutput?.(e, s);
    },
    i
  );
}
m.set("n", {
  tags: ["math"],
  description: "Constant value node. Turns a number into a Node.",
  ins: [{ name: "value", default: 0 }]
});
function g(e) {
  return Array.isArray(e) ? poly(...e.map((t) => g(t))) : typeof e == "object" ? e : $("n", e);
}
m.set("out", {
  tags: ["meta"],
  description: "Sends the node to the audio output"
});
m.set("withIns", {
  internal: !0,
  tags: ["innards"],
  description: "Sets the inputs of a node. Returns the node itself",
  ins: [{ name: "in", dynamic: !0 }]
});
u.prototype.withIns = function(...e) {
  return this.ins = e, this;
};
m.set("flatten", {
  internal: !0,
  tags: ["innards"],
  description: "Flattens the node to a list of all nodes in the graph, where each Node's ins are now indices"
});
u.prototype.flatten = function() {
  return le(this);
};
m.set("apply", {
  graph: !0,
  tags: ["meta"],
  description: "Applies the given function to the Node. Useful when a node has to be used multiple times.",
  examples: [
    `impulse(4)
.apply(imp=>imp
  .seq(110,220,330,440)
  .sine()
  .mul( imp.ad(.1,.1) )
).out()`
  ]
});
u.prototype.apply = function(e) {
  return e(this);
};
m.set("clone", {
  internal: !0,
  tags: ["innards"],
  description: "Clones the node"
});
u.prototype.clone = function() {
  return new u(this.type, this.value).withIns(...this.ins);
};
m.set("map", {
  tags: ["meta"],
  description: "Applies the given function to all ins if it's poly node. Otherwise it applies the function to itself.",
  examples: [
    `n([110,220,330])
.map( freq=>freq.mul([1,1.007]).saw().mix() )
.mix(2).mul(.5).out()`
  ]
});
u.prototype.map = function(e) {
  return this.type !== "poly" ? e(this) : poly(...this.ins.map(e));
};
u.prototype.channel = function(e) {
  return this.type !== "poly" ? this : this.ins[e % this.ins.length];
};
m.set("select", {
  tags: ["meta"],
  graph: !0,
  description: "Find the first occurence of the given type up in the graph and returns the match. Useful to exit a feedback loop at another point.",
  examples: [
    `sine(220).mul(impulse(1).ad(.001,.2))
.add( x=>x.delay(.2).mul(.8) )
.select('delay').out()
`
  ]
});
u.prototype.select = function(e) {
  for (let t of this.ins) {
    if (t.type === e)
      return t;
    const i = t.select(e);
    if (i)
      return i;
  }
};
m.set("debug", {
  tags: ["meta"],
  description: "Logs the node to the console"
});
u.prototype.debug = function(e = (t) => t) {
  return console.log(e(this)), this;
};
function re(e) {
  const t = modules.get(e), i = Array.from(
    { length: t.length },
    (s, r) => $(`$INPUT${r}`)
  ), n = t(...i);
  return JSON.stringify(n, null, 2);
}
function le(e) {
  const t = [];
  return I(e, (i) => (t.push(i), i)), t.map((i) => {
    let n = {
      ...i,
      type: i.type,
      ins: i.ins.map((s) => t.indexOf(s) + "")
    };
    return i.value !== void 0 && (n.value = i.value), i.to !== void 0 && (n.to = t.indexOf(i.to)), n;
  });
}
let W = a("exit", { internal: !0 });
function F(e, t) {
  let i = [];
  return u.prototype.out = function(s = [0, 1]) {
    i.push(this.output(s));
  }, t ? (t.out = (s = g(0), r) => s.out(r), Function(...Object.keys(t), e)(...Object.values(t))) : (globalThis.out = (s = g(0), r) => s.out(r), Function(e)()), W(...i);
}
u.prototype.over = function(e) {
  return this.apply((t) => add(t, e(t)));
};
u.prototype.dfs = function(e, t) {
  return this.apply((i) => I(i, e, t));
};
u.prototype.apply2 = function(e) {
  return e(this, this);
};
let I = (e, t, i = []) => (e = t(e, i), i.push(e), e.ins = e.ins.map((n) => i.includes(n) ? n : I(n, t, i)), e);
u.prototype.asModuleInput = function(e, t, i) {
  return this.inputOf = this.inputOf || [], this.inputOf.push([e, t, i]), this;
};
u.prototype.asModuleOutput = function(e, t) {
  return this.outputOf = [e, t], this;
};
function A(e, t = {}) {
  const {
    log: i = !1,
    lang: n = "js",
    fallbackType: s = "thru",
    constType: r = "n",
    getRegister: l = (c) => `r[${c}]`,
    getOutput: x = (c) => `o[${c}]`,
    getSource: d = (c) => `s[${c}]`
  } = t;
  i && console.log("compile", e);
  const f = ue(e);
  let p = [], k = (c) => f[c].type !== r ? l(c) : typeof f[c].value == "string" ? `"${f[c].value}"` : f[c].value;
  const v = [];
  for (let c in f) {
    const E = f[c], R = f[c].ins.map((se) => k(f.indexOf(se))), ie = v.length;
    let w = m.get(E.type);
    w || (console.warn(
      `unhandled node type "${f[c].type}". falling back to "${s}"`
    ), w = m.get(s));
    const ne = {
      vars: R,
      node: E,
      nodes: f,
      id: c,
      ugenIndex: ie,
      ugen: w.ugen,
      name: k(c),
      lang: n,
      getRegister: l,
      getOutput: x,
      getSource: d
    };
    w.compile && p.push(w.compile(ne)), w.ugen && v.push({ type: w.ugen, inputs: R });
  }
  const U = p.join(`
`);
  return i && (console.log("compiled code:"), console.log(U)), { src: U, ugens: v, registers: f.length };
}
u.prototype.compile = function(e) {
  return A(this, e);
};
function ue(e) {
  const t = [], i = /* @__PURE__ */ new Set();
  function n(s) {
    if (!(typeof s != "object" || i.has(s))) {
      i.add(s);
      for (let r in s.ins)
        n(s.ins[r]);
      t.push(s);
    }
  }
  return n(e), t;
}
const P = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  compile: A
}, Symbol.toStringTag, { value: "Module" }));
class G {
  constructor() {
    this._events = {};
  }
  on(t, i) {
    this._events[t] || (this._events[t] = []);
    let n = this._events[t];
    M(n.indexOf(i) == -1), n.push(i);
  }
  removeListener(t, i) {
    let n = this._events[t], s = n.indexOf(i);
    s != -1 && n.splice(s, 1);
  }
  trigger(t, ...i) {
    let n = this._events[t] || [];
    for (let s = 0; s < n.length; s++)
      n[s].apply(null, i);
  }
}
class de extends G {
  constructor(t = navigator) {
    super(), this.midiAccess = null, this.getMIDIAccess(t);
  }
  // Try to get MIDI access from the browser
  async getMIDIAccess(t) {
    if ("requestMIDIAccess" in t) {
      this.midiAccess = await t.requestMIDIAccess({ sysex: !1 }), console.log("got MIDI access");
      for (let i of this.midiAccess.inputs.values())
        i.state == "connected" && (i.onmidimessage = (n) => this.trigger("midimessage", i.id, n.data));
      this.midiAccess.onstatechange = (i) => {
        i.port.type == "input" && i.port.state == "connected" && (console.log(
          "MIDI device connected:",
          i.port.name,
          "PORT:",
          i.port.id
        ), i.port.onmidimessage = (n) => this.trigger("midimessage", i.port.id, n.data));
      };
    }
  }
  // Send a message to all MIDI devices
  broadcast(t, i) {
    if (midi)
      for (let n of this.midiAccess.outputs.values())
        n.send(t, i);
  }
}
function pe(e) {
  let t = e[0] & 240, i = (e[0] & 15) + 1;
  if (t == 176 && e.length == 3) {
    let n = e[1], r = e[2] / 127 * 2 - 1;
    return { type: "CC", channel: i, cc: n, value: r };
  }
  if (t == 224 && e.length == 3) {
    let n = e[1], l = (e[2] << 7 | n) / 16383 * 2 - 1;
    return { type: "PITCHBEND", channel: i, value: l };
  }
  if (t == 144 && e.length == 3) {
    let n = e[1], s = e[2];
    return { type: "NOTE_ON", channel: i, note: n, velocity: s };
  }
  if (t == 128 && e.length == 3) {
    let n = e[1];
    return { type: "NOTE_ON", channel: i, note: n, velocity: 0 };
  }
}
class ce extends G {
  constructor() {
    super(), this.attach();
  }
  attach() {
    typeof window < "u" && (this.handleMouseMove = (t) => {
      const i = t.clientX / document.body.clientWidth * 2 - 1, n = t.clientY / document.body.clientHeight * 2 - 1;
      this.trigger("move", i, n);
    }, document.addEventListener("mousemove", this.handleMouseMove));
  }
  detach() {
    typeof window < "u" && document.removeEventListener("mousemove", this.handleMouseMove);
  }
}
const me = "/assets/worklet-DzGFm3ry.js", fe = "/assets/recorder-BokptUnY.js";
function ge(e, t, i) {
  if (e.length < 1)
    return;
  e[0];
  const n = 3, s = 32, r = e.map((v) => v.length).reduce((v, U) => v + U, 0), l = s / 8, x = i * l, d = 44, f = new ArrayBuffer(d + r * l), p = new DataView(f);
  S(p, 0, "RIFF"), p.setUint32(4, 36 + r * l, !0), S(p, 8, "WAVE"), S(p, 12, "fmt "), p.setUint32(16, 16, !0), p.setUint16(20, n, !0), p.setUint16(22, i, !0), p.setUint32(24, t, !0), p.setUint32(28, t * x, !0), p.setUint16(32, x, !0), p.setUint16(34, s, !0), S(p, 36, "data"), p.setUint32(40, r * l, !0);
  let k = 44;
  for (const v of e)
    he(p, k, v), k += v.length * l;
  return f;
}
function S(e, t, i) {
  for (let n = 0; n < i.length; n++)
    e.setUint8(t + n, i.charCodeAt(n));
}
function he(e, t, i) {
  for (var n = 0; n < i.length; n++, t += 4)
    e.setFloat32(t, i[n], !0);
}
const D = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Node: u,
  compile: A,
  evaluate: F,
  exit: W,
  exportModule: re,
  getInletName: oe,
  getNode: B,
  module: h,
  n: g,
  node: $,
  nodeRegistry: m,
  register: y,
  registerNode: a
}, Symbol.toStringTag, { value: "Module" }));
let xe = (e) => `Math.sin(${e})`, ye = (e) => `Math.cos(${e})`, z = (e, t, i) => `${e} = ${t};${i ? ` /* ${i} */` : ""}`, H = (e, ...t) => z(
  e.name,
  `nodes[${e.ugenIndex}].update(${t.join(",")})`,
  e.node.type
), ve = (e) => `(2 ** ((${e} - 69) / 12) * 440)`, we = (e, t) => `${e} ** ${t}`, be = (e) => `Math.exp(${e})`, $e = (e) => `Math.log(${e})`, ke = (e, t) => `${e}%${t}`, _e = (e) => `Math.abs(${e})`, Oe = (e) => `Math.round(${e})`, Ue = (e, t) => `Math.min(${e}, ${t})`, Se = (e, t) => `Math.max(${e}, ${t})`, Me = (e, t) => `[${e}, ${t}]`, _ = (e) => `${e}[0]`, Ce = (e) => `${e}[1]`, Te = (e, t) => `(${_(e)} < ${_(t)} ? ${e} : ${t})`, Ie = (e, t) => `(${_(e)} > ${_(t)} ? ${e} : ${t})`;
const Ae = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  abs: _e,
  def: z,
  defCos: ye,
  defSin: xe,
  defUgen: H,
  exp: be,
  log: $e,
  max: Se,
  midinote: ve,
  min: Ue,
  mod: ke,
  pair_a: _,
  pair_a_max: Ie,
  pair_a_min: Te,
  pair_b: Ce,
  pair_make: Me,
  pow: we,
  round: Oe
}, Symbol.toStringTag, { value: "Module" }));
class Ne {
  constructor() {
    this.ugens = /* @__PURE__ */ new Map();
  }
  async updateGraph(t) {
    this.graph = t;
    const { src: i, ugens: n, registers: s } = t.compile({
      log: !1
    });
    this.initMouse(), !this.midiInited && n.some((r) => r.type.startsWith("Midi")) && this.initMidi(), !this.audioIn && n.some((r) => r.type === "AudioIn") && await this.initAudioIn(), this.sendUgens(), this.send({
      type: "NEW_UNIT",
      unit: { src: i, ugens: n, registers: s }
    });
  }
  // ugen is expected to be a class
  registerUgen(t) {
    this.ugens.set(t.name, t);
  }
  sendUgens() {
    for (let [t, i] of this.ugens)
      this.send({
        type: "SET_UGEN",
        className: t,
        ugen: i + ""
      });
  }
  scheduleMessage(t, i) {
    this.send({
      type: "SCHEDULE_MSG",
      msg: t,
      time: i
    });
  }
  setControl(t, i, n) {
    const s = {
      type: "SET_CONTROL",
      id: t,
      value: i
    };
    n ? this.send({ type: "SCHEDULE_MSG", time: n, msg: s }) : this.send(s);
  }
  // controls: { id, value, time }[]
  setControls(t) {
    const i = {
      type: "BATCH_MSG",
      messages: t.map((n) => {
        const s = { type: "SET_CONTROL", id: n.id, value: n.value };
        return n.time === void 0 ? s : {
          type: "SCHEDULE_MSG",
          time: n.time,
          msg: s
        };
      })
    };
    this.send(i);
  }
  async initAudioIn() {
    console.log("init audio input...");
    const t = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: !1,
        noiseSuppression: !1,
        autoGainControl: !1
      }
    });
    this.audioCtx.createMediaStreamSource(t).connect(this.audioWorklet);
  }
  initMidi() {
    console.log("init midi input..."), this.midiInited = !0, new de().on("midimessage", (i, n) => {
      const s = pe(n);
      s && this.send(s);
    });
  }
  initMouse() {
    this.mouse = new ce(), this.mouse.on("move", (t, i) => {
      this.setControl("mouseX", t), this.setControl("mouseY", i);
    });
  }
  /**
   * Send a message to the audio thread (audio worket)
   */
  send(t) {
    M(t instanceof Object), this.audioWorklet && this.audioWorklet.port.postMessage(t);
  }
  async init() {
    if (!this.audioCtx) {
      if (M(!this.audioCtx), this.audioCtx = new AudioContext({
        latencyHint: "interactive",
        sampleRate: 44100
      }), await this.audioCtx.resume(), !this.audioCtx.audioWorklet)
        throw new Error(
          "Audio cannot be loaded: non-secure origin? (AudioContext.audioWorklet is undefined)"
        );
      await this.audioCtx.audioWorklet.addModule(me), await this.audioCtx.audioWorklet.addModule(fe), this.audioWorklet = new AudioWorkletNode(
        this.audioCtx,
        "sample-generator",
        {
          outputChannelCount: [2]
        }
      ), this.audioWorklet.port.onmessage = (t) => {
        const { id: i, time: n, type: s } = t.data;
        s === "SIGNAL_TRIGGER" && this.graph.dfs((r) => {
          if (r.type === "signal" && r.id === i) {
            const l = r.callback(n, i);
            isNaN(l) ? l !== void 0 && console.warn(
              `expected number from "on" callback with id "${i}", got "${l}" instead.`
            ) : window.postMessage({
              type: "KABELSALAT_SET_CONTROL",
              value: l,
              id: i
            });
          }
          return r;
        }), s === "STOP" && setTimeout(() => this.destroy(), t.data.fadeTime * 1e3 + 200);
      }, this.recorder = new window.AudioWorkletNode(this.audioCtx, "recorder"), this.audioWorklet.connect(this.recorder), this.sendUgens(), this.recorder.connect(this.audioCtx.destination), this.recorder.port.onmessage = (t) => {
        if (t.data.eventType === "data" && this.recordedBuffers.push(t.data.audioBuffer), t.data.eventType === "stop") {
          console.log("recording stopped");
          const i = ge(
            this.recordedBuffers,
            this.audioCtx.sampleRate,
            2
          );
          je(i, "kabelsalat.wav", "audio/wav"), this.recordedBuffers = [];
        }
      }, this.recordOnPlay && this.record();
    }
  }
  destroy() {
    this.audioWorklet?.disconnect(), this.audioWorklet = null, this.recorder?.disconnect(), this.recorder = null, this.audioCtx?.close(), this.audioCtx = null;
  }
  /**
   * Stop audio playback
   */
  stop() {
    this.audioCtx && this.send({ type: "STOP" }), this.mouse?.detach();
  }
  record() {
    if (!this.audioCtx) {
      this.recordOnPlay = !0;
      return;
    }
    this.recordedBuffers = [], this.recorder.parameters.get("isRecording").setValueAtTime(1, 0), console.log("recording started");
  }
  stopRecording() {
    this.recordOnPlay = !1, this.audioCtx && this.recorder.parameters.get("isRecording").setValueAtTime(0, 0);
  }
  set fadeTime(t) {
    this.send({ type: "FADE_TIME", fadeTime: t });
  }
}
function je(e, t, i) {
  const n = new Blob([e], { type: i }), s = document.createElement("a");
  s.href = window.URL.createObjectURL(n), s.download = t, s.click();
}
let Ee = 0, hi = y(
  "signal",
  (e, t) => {
    const i = Ee++, n = getNode("signal", e, i);
    return n.callback = t, n.id = i, n;
  },
  {
    ugen: "Signal",
    compile: ({ vars: [e, t], ...i }) => H(i, e, t, "time")
  }
), Re = (e) => `sin(${e})`, qe = (e) => `cos(${e})`, C = (e, t, i) => `${e} = ${t};${i ? ` /* ${i} */` : ""}`, Pe = (e, ...t) => {
  if (t.unshift(`nodes[${e.ugenIndex}]`), e.ugen === "Sequence" || e.ugen === "Pick") {
    const i = t.length - 2, n = `(float[${i}]){${t.slice(2).join(",")}}`;
    return C(
      e.name,
      `${e.ugen}_update(${t[0]}, ${t[1]}, ${i}, ${n})`,
      e.ugen
    );
  }
  return C(e.name, `${e.ugen}_update(${t.join(",")})`, e.ugen);
}, De = (e) => `pow(2.0, ((${e} - 69.0) / 12.0)) * 440.0`, Le = (e, t) => `pow(${e}, ${t})`, Be = (e) => `exp(${e})`, We = (e) => `log(${e})`, Fe = (e, t) => `${e}>=${t}?${e}-${t}:${e}`, Ge = (e) => `fabs(${e})`, ze = (e, t) => `fmin(${e}, ${t})`, He = (e, t) => `fmax(${e}, ${t})`, Ye = (e, t) => `((pair) {${e}, ${t}})`, O = (e) => `${e}.a`, Xe = (e) => `${e}.b`, Ve = (e, t) => `(${O(e)} < ${O(t)} ? ${e} : ${t})`, Je = (e, t) => `(${O(e)} > ${O(t)} ? ${e} : ${t})`;
const Ke = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  abs: Ge,
  def: C,
  defCos: qe,
  defSin: Re,
  defUgen: Pe,
  exp: Be,
  log: We,
  max: He,
  midinote: De,
  min: ze,
  mod: Fe,
  pair_a: O,
  pair_a_max: Je,
  pair_a_min: Ve,
  pair_b: Xe,
  pair_make: Ye,
  pow: Le
}, Symbol.toStringTag, { value: "Module" })), o = {
  js: Ae,
  c: Ke
}, Y = (e, t) => a(e, {
  ugen: t,
  compile: ({ vars: i, ...n }) => o[n.lang].defUgen(n, ...i)
});
let Ze = y("time", (e) => new u("time", e), {
  tags: ["meta"],
  description: "Returns elapsed time in seconds",
  compile: ({ name: e, lang: t }) => o[t].def(e, "time")
}), Qe = y(
  "raw",
  (e, t) => new u("raw", t).withIns(g(e)),
  {
    ins: [
      { name: "in" },
      {
        name: "code",
        description: "expression with variable `t` being the elapsed time and `$input` the input."
      }
    ],
    tags: ["meta"],
    description: "Raw code node, expects floats between -1 and 1",
    compile: ({ vars: e, node: t, name: i }) => `let $input = ${e[0]}; 
const ${i} = (${t.value}); // raw`,
    examples: [
      `sine(4).range(.5,1)
.raw("(time*110%1*2-1)*$input")
.out()`
    ]
  }
), et = y(
  "bytebeat",
  (e, t) => new u("bytebeat", t).withIns(g(e)),
  {
    ins: [
      { name: "t", description: "time in samples" },
      {
        name: "code",
        description: "bytebeat code with variable `t`"
      }
    ],
    tags: ["meta"],
    description: "Bytebeat node, expects numbers from 0 to 255",
    examples: [
      `time().mul(8000).bytebeat\`
// Fractalized Past
// by: lhphr
// from: https://dollchan.net/btb/res/3.html#69

(t>>10^t>>11)%5*((t>>14&3^t>>15&1)+1)*t%99+((3+(t>>14&3)-(t>>16&1))/3*t%99&64)
\`.out()`
    ],
    compile: ({ vars: e, node: t, name: i }) => `let t = ${e[0]}; 
const ${i} = ((${t.value}) & 255) / 127.5 - 1; // bytebeat`
  }
), tt = y(
  "floatbeat",
  (e, t) => new u("bytebeat", t).withIns(g(e)),
  {
    ins: [
      { name: "t", description: "time in samples" },
      {
        name: "code",
        description: "floatbeat code with variable `t`"
      }
    ],
    tags: ["meta"],
    description: "Raw code node, expects numbers from -1 to 1",
    compile: ({ vars: e, node: t, name: i }) => `let t = ${e[0]}; const ${i} = (${t.value}); // floatbeat`
  }
), it = a("adsr", {
  ugen: "ADSRNode",
  tags: ["envelope"],
  description: "ADSR envelope",
  examples: [
    `impulse(1).perc(.5)
.adsr(.01, .1, .5, .1)
.mul(sine(220)).out()`
  ],
  ins: [
    { name: "gate", default: 0, description: "gate input" },
    { name: "att", default: 0.02, description: "attack time" },
    { name: "dec", default: 0.1, description: "decay time" },
    { name: "sus", default: 0.2, description: "sustain level" },
    { name: "rel", default: 0.1, description: "release time" }
  ],
  compile: ({
    vars: [e = 0, t = 0.02, i = 0.1, n = 0.2, s = 0.1],
    ...r
  }) => o[r.lang].defUgen(r, "time", e, t, i, n, s)
}), nt = h(
  "ar",
  (e = 0, t = 0.02, i = 0.1) => e.adsr(t, 0, 1, i),
  {
    tags: ["envelope"],
    description: "AR envelope",
    examples: ["impulse(1).ad(.01, .1).mul(sine(220)).out()"],
    ins: [
      { name: "trig", default: 0, description: "gate input" },
      { name: "att", default: 0.02, description: "attack time" },
      { name: "rel", default: 0.1, description: "release time" }
    ]
  }
), st = h(
  "ad",
  (e = 0, t = 0.02, i = 0.1) => e.adsr(t, i, 0, i),
  {
    tags: ["envelope"],
    description: "AD envelope",
    examples: ["impulse(1).ad(.01, .1).mul(sine(220)).out()"],
    ins: [
      { name: "trig", default: 0, description: "gate input" },
      { name: "att", default: 0.02, description: "attack time" },
      { name: "dec", default: 0.1, description: "decay time" }
    ]
  }
), ot = a("clock", {
  ugen: "Clock",
  internal: !0,
  // impulse is the preferred way..
  tags: ["regular", "clock"],
  description: "Clock source, with tempo in BPM",
  examples: ["clock(120).clockdiv(16).mul(sine(220)).out()"],
  ins: [
    {
      name: "bpm",
      default: 120,
      description: "clock tempo in bpm (beats per minute)"
    }
  ],
  compile: ({ vars: [e = 120], ...t }) => o[t.lang].defUgen(t, e)
}), at = a("clockdiv", {
  ugen: "ClockDiv",
  tags: ["clock", "trigger"],
  description: "Clock signal divider",
  examples: ["impulse(8).clockdiv(2).ad(.1,.1).mul(sine(220)).out()"],
  ins: [
    { name: "clock", default: 0, description: "clock input" },
    { name: "divisor", default: 2, description: "tempo divisor" }
  ],
  compile: ({ vars: [e = 0, t = 2], ...i }) => o[i.lang].defUgen(i, e, t)
}), rt = a("distort", {
  ugen: "Distort",
  tags: ["fx", "distortion"],
  description: "Overdrive-style distortion",
  examples: [
    `sine(220)
.distort( saw(.5).range(0,1) )
.out()`
  ],
  ins: [
    { name: "in", default: 0 },
    { name: "amt", default: 0, description: "distortion amount" }
  ],
  compile: ({ vars: [e = 0, t = 0], ...i }) => o[i.lang].defUgen(i, e, t)
}), X = a("noise", {
  ugen: "NoiseOsc",
  tags: ["source", "noise"],
  description: "White noise source",
  examples: ["noise().mul(.25).out()"],
  ins: [],
  compile: ({ lang: e, ...t }) => o[e].defUgen(t)
}), lt = a("pink", {
  ugen: "PinkNoise",
  tags: ["source", "noise"],
  description: "Pink noise source",
  examples: ["pink().mul(.5).out()"],
  ins: [],
  compile: ({ lang: e, ...t }) => o[e].defUgen(t)
}), ut = a("brown", {
  ugen: "BrownNoiseOsc",
  tags: ["source", "noise"],
  description: "Brown noise source",
  examples: ["brown().out()"],
  ins: [],
  compile: ({ lang: e, ...t }) => o[e].defUgen(t)
}), dt = a("dust", {
  ugen: "DustOsc",
  tags: ["trigger", "noise", "source"],
  description: "Generates random impulses from 0 to +1.",
  examples: ["dust(200).out()"],
  ins: [
    { name: "density", default: 0, description: "average impulses per second" }
  ],
  compile: ({ vars: [e = 0], ...t }) => o[t.lang].defUgen(t, e)
}), V = a("impulse", {
  ugen: "ImpulseOsc",
  tags: ["regular", "trigger"],
  description: "Regular single sample impulses (0 - 1)",
  examples: ["impulse(10).out()"],
  ins: [
    { name: "freq", default: 0 },
    { name: "phase", default: 0 }
  ],
  compile: ({ vars: [e = 0, t = 0], ...i }) => o[i.lang].defUgen(i, e, t)
}), pt = a("saw", {
  ugen: "SawOsc",
  tags: ["regular", "waveform", "source"],
  description: "Sawtooth wave oscillator with anti aliasing",
  examples: ["saw(110).mul(.5).out()"],
  ins: [{ name: "freq", default: 0 }],
  compile: ({ vars: [e = 0], ...t }) => o[t.lang].defUgen(t, e)
}), ct = a("zaw", {
  ugen: "ZawOsc",
  tags: ["regular", "waveform", "source"],
  description: "Sawtooth wave oscillator with sharp edges. Use saw for anti aliased variant.",
  examples: ["zaw(110).mul(.5).out()"],
  ins: [{ name: "freq", default: 0 }],
  compile: ({ vars: [e = 0], ...t }) => o[t.lang].defUgen(t, e)
}), mt = a("sine", {
  tags: ["regular", "waveform", "source"],
  ugen: "SineOsc",
  description: "Sine wave oscillator",
  examples: ["sine(220).out()"],
  ins: [
    { name: "freq", default: 0 },
    { name: "sync", default: 0, description: "sync input" },
    { name: "phase", default: 0, description: "phase offset" }
  ],
  compile: ({ vars: [e = 0, t = 0, i = 0], ...n }) => o[n.lang].defUgen(n, e, t, i)
}), ft = a("tri", {
  ugen: "TriOsc",
  tags: ["regular", "waveform", "source"],
  description: "Triangle wave oscillator",
  examples: ["tri(220).out()"],
  ins: [{ name: "freq", default: 0 }],
  compile: ({ vars: [e = 0], ...t }) => o[t.lang].defUgen(t, e)
}), gt = a("pulse", {
  ugen: "PulseOsc",
  tags: ["regular", "waveform", "source"],
  description: "Pulse wave oscillator",
  examples: ["pulse(220, sine(.1).range(.1,.5)).mul(.5).out()"],
  ins: [
    { name: "freq", default: 0 },
    { name: "pw", default: 0.5, description: "pulse width 0 - 1" }
  ],
  compile: ({ vars: [e = 0, t = 0.5], ...i }) => o[i.lang].defUgen(i, e, t)
}), ht = a("slide", {
  ugen: "Slide",
  tags: ["fx"],
  internal: !0,
  description: "Slide/portamento node",
  examples: [
    `impulse(2).seq(55,110,220,330)
.slide(4).sine().out()`
  ],
  ins: [
    { name: "in", default: 0 },
    { name: "rate", default: 1 }
  ],
  compile: ({ vars: [e = 0, t = 1], ...i }) => o[i.lang].defUgen(i, e, t)
}), xt = a("lag", {
  ugen: "Lag",
  tags: ["fx"],
  description: "Smoothes a signal. Good for slide / portamento effects.",
  examples: [
    `impulse(2).seq(220,330,440,550)
.lag(.4).sine().out()`
  ],
  ins: [
    { name: "in", default: 0 },
    { name: "rate", default: 1, description: "60 dB lag time in seconds" }
  ],
  compile: ({ vars: [e = 0, t = 1], ...i }) => o[i.lang].defUgen(i, e, t)
}), yt = a("slew", {
  ugen: "Slew",
  tags: ["fx"],
  description: "Limits the slope of an input signal. The slope is expressed in units per second.",
  examples: ["pulse(800).slew(4000, 4000).out()"],
  ins: [
    { name: "in", default: 0 },
    {
      name: "up",
      default: 1,
      description: "Maximum upward slope in units per second"
    },
    {
      name: "dn",
      default: 1,
      description: "Maximum downward slope in units per second"
    }
  ],
  compile: ({ vars: [e = 0, t = 1, i = 1], ...n }) => o[n.lang].defUgen(n, e, t, i)
}), J = a("filter", {
  ugen: "Filter",
  tags: ["fx", "filter"],
  internal: !0,
  description: "Two-pole low-pass filter",
  examples: ["saw(55).lpf( sine(1).range(.4,.8) ).out()"],
  ins: [
    { name: "in", default: 0 },
    { name: "cutoff", default: 1 },
    { name: "reso", default: 0 }
  ],
  compile: ({ vars: [e = 0, t = 1, i = 0], ...n }) => o[n.lang].defUgen(n, e, t, i)
}), vt = a("fold", {
  ugen: "Fold",
  tags: ["fx", "distortion", "limiter"],
  description: 'Distort incoming audio signal by "folding"',
  examples: [
    `sine(55)
.fold( sine(.5).range(0.2,4) )
.out()`
  ],
  ins: [
    { name: "in", default: 0 },
    { name: "rate", default: 0 }
  ],
  compile: ({ vars: [e = 0, t = 0], ...i }) => o[i.lang].defUgen(i, e, t)
}), wt = a("seq", {
  ugen: "Sequence",
  tags: ["sequencer"],
  description: "Trigger controlled sequencer",
  examples: [
    `impulse(2).seq(220,330,440,550)
.sine().out()`
  ],
  ins: [
    { name: "trig", default: 0 },
    { name: "step", default: 0, dynamic: !0, description: "step inputs" }
    // 1-Infinity of steps
  ],
  compile: ({ vars: e, ...t }) => o[t.lang].defUgen(t, ...e)
}), bt = a("delay", {
  ugen: "Delay",
  tags: ["fx"],
  description: "Delay line node",
  examples: [
    `impulse(1).ad(.01,.2).mul(sine(220))
.add(x=>x.delay(.1).mul(.8)).out()`
  ],
  ins: [
    { name: "in", default: 0 },
    { name: "time", default: 0 }
  ],
  compile: ({ vars: [e = 0, t = 0], ...i }) => o[i.lang].defUgen(i, e, t)
}), $t = a("hold", {
  ugen: "Hold",
  tags: ["fx"],
  description: "Sample and hold",
  examples: [
    `noise().hold(impulse(2))
.range(220,880).sine().out()`
  ],
  ins: [
    { name: "in", default: 0 },
    { name: "trig", default: 0 }
  ],
  compile: ({ vars: [e = 0, t = 0], ...i }) => o[i.lang].defUgen(i, e, t)
}), kt = a("midifreq", {
  ugen: "MidiFreq",
  tags: ["external", "midi"],
  description: "Outputs frequency of midi note in. Multiple instances will do voice allocation",
  examples: ["midifreq().sine().out()"],
  ins: [
    {
      name: "channel",
      default: -1,
      description: "Channel filter. Defaults to all channels"
    }
  ],
  compile: ({ vars: [e = -1], ...t }) => o[t.lang].defUgen(t, e)
}), _t = a("midigate", {
  ugen: "MidiGate",
  tags: ["external", "midi"],
  description: "outputs gate of midi note in. Multiple instances will do voice allocation",
  examples: ["midigate().lag(1).mul(sine(220)).out()"],
  ins: [{ name: "channel", default: -1 }],
  compile: ({ vars: [e = -1], ...t }) => o[t.lang].defUgen(t, e)
}), Ot = a("midicc", {
  ugen: "MidiCC",
  tags: ["external", "midi"],
  description: "outputs bipolar value of given midi cc number",
  examples: ["midicc(74).range(100,200).sine().out()"],
  ins: [
    { name: "ccnumber", default: -1 },
    { name: "channel", default: -1 }
  ],
  compile: ({ vars: [e = -1, t = -1], ...i }) => o[i.lang].defUgen(i, e, t)
}), N = a("cc", {
  ugen: "CC",
  tags: ["external"],
  description: "CC control",
  ins: [
    { name: "id", default: 0 },
    { name: "value", default: 0 }
  ],
  compile: ({ vars: [e], ...t }) => o[t.lang].defUgen(t, e)
}), Ut = a("audioin", {
  ugen: "AudioIn",
  tags: ["source", "external"],
  description: "External Audio Input, depends on your system input",
  examples: ["audioin().add(x=>x.delay(.1).mul(.8)).out()"],
  ins: [],
  compile: (e) => o[e.lang].defUgen(e, "input")
}), T = a("log", {
  tags: ["math"],
  description: "calculates the logarithm (base 10) of the input signal",
  ins: [{ name: "in" }],
  compile: ({ vars: [e = 0], name: t, lang: i }) => o[i].def(t, o[i].log(e))
}), K = a("exp", {
  tags: ["math"],
  description: "raises e to the power of the input signal",
  ins: [{ name: "in" }],
  compile: ({ vars: [e = 0], name: t, lang: i }) => o[i].def(t, o[i].exp(e))
}), St = a("pow", {
  tags: ["math"],
  description: "raises the input to the given power",
  ins: [{ name: "in" }, { name: "power" }],
  compile: ({ vars: [e = 0, t = 1], name: i, lang: n }) => o[n].def(i, o[n].pow(e, t))
}), Z = a("sin", {
  tags: ["math"],
  description: "calculates the sine of the input signal",
  ins: [{ name: "in" }],
  compile: ({ vars: [e = 0], name: t, lang: i }) => o[i].def(t, o[i].defSin(e))
}), Q = a("cos", {
  tags: ["math"],
  description: "calculates the cosine of the input signal",
  ins: [{ name: "in" }],
  compile: ({ vars: [e = 0], name: t, lang: i }) => o[i].def(t, o[i].defCos(e))
}), Mt = a("mul", {
  tags: ["math"],
  description: "Multiplies the given signals.",
  examples: ["sine(220).mul( sine(4).range(.25,1) ).out()"],
  ins: [{ name: "in", dynamic: !0 }],
  compile: ({ vars: e, name: t, lang: i }) => o[i].def(t, e.join(" * ") || 0)
}), j = a("add", {
  tags: ["math"],
  description: "sums the given signals",
  examples: ["n([0,3,7,10]).add(60).midinote().sine().mix(2).out()"],
  ins: [{ name: "in", dynamic: !0 }],
  compile: ({ vars: e, name: t, lang: i }) => o[i].def(t, e.join(" + ") || 0)
}), Ct = a("div", {
  tags: ["math"],
  description: "adds the given signals",
  ins: [{ name: "in", dynamic: !0 }],
  compile: ({ vars: e, name: t, lang: i }) => o[i].def(t, e.join(" / ") || 0)
}), Tt = a("sub", {
  tags: ["math"],
  description: "subtracts the given signals",
  ins: [{ name: "in", dynamic: !0 }],
  compile: ({ vars: e, name: t, lang: i }) => o[i].def(t, e.join(" - ") || 0)
}), It = a("mod", {
  tags: ["math"],
  description: "calculates the modulo",
  examples: ["add(x=>x.add(.003).mod(1)).out()"],
  ins: [{ name: "in" }, { name: "modulo" }],
  compile: ({ vars: e, name: t, lang: i }) => o[i].def(t, o[i].mod(...e) || 0)
}), At = a("abs", {
  tags: ["math"],
  description: "returns the absolute value of the signal",
  ins: [{ name: "in" }],
  examples: ["sine(440).abs().out()"],
  compile: ({ vars: [e = 0], name: t, lang: i }) => o[i].def(t, o[i].abs(e))
}), Nt = a("round", {
  tags: ["math"],
  description: "Rounds the signal to the nearest integer",
  ins: [{ name: "in" }],
  examples: ["sine(440.5).round().out()"],
  compile: ({ vars: [e = 0], name: t, lang: i }) => o[i].def(t, o[i].round(e))
}), jt = a("min", {
  tags: ["math"],
  description: "returns the minimum of the given signals",
  examples: [
    "impulse(4).apply(x => min(x.seq(0,3,2), x.seq(0,7,0,5,0)).add(48).midinote().sine()).out()"
  ],
  ins: [{ name: "in", dynamic: !0 }],
  compile: ({ vars: e, name: t, lang: i }) => o[i].def(t, e.reduce(o[i].min) || 0)
}), Et = a("max", {
  tags: ["math"],
  description: "returns the maximum of the given signals",
  examples: [
    "impulse(4).apply(x => max(x.seq(0,3,2), x.seq(0,7,0,5,0)).add(48).midinote().sine()).out()"
  ],
  ins: [{ name: "in", dynamic: !0 }],
  compile: ({ vars: e, name: t, lang: i }) => o[i].def(t, e.reduce(o[i].max) || 0)
}), Rt = a("argmin", {
  tags: ["math"],
  description: "returns the index of the minimum of the given signals",
  examples: [
    "argmin(saw(1), saw(3), saw(5)).mul(12).add(48).midinote().sine().out()"
  ],
  ins: [{ name: "in", dynamic: !0 }],
  compile: ({ vars: e, name: t, lang: i }) => o[i].def(
    t,
    o[i].pair_b(
      e.map(o[i].pair_make).reduce(o[i].pair_a_min)
    ) || 0
  )
}), qt = a("argmax", {
  tags: ["math"],
  description: "returns the index of the maximum of the given signals",
  examples: [
    "argmax(saw(1), saw(3), saw(5)).mul(12).add(48).midinote().sine().out()"
  ],
  ins: [{ name: "in", dynamic: !0 }],
  compile: ({ vars: e, name: t, lang: i }) => o[i].def(
    t,
    o[i].pair_b(
      e.map(o[i].pair_make).reduce(o[i].pair_a_max)
    ) || 0
  )
}), Pt = a("greater", {
  tags: ["logic"],
  description: "returns 1 if input is greater then threshold",
  ins: [{ name: "in" }, { name: "threshold" }],
  examples: [
    `greater(sine(1),0)
.bipolar().range(100,200)
.sine().out()`
  ],
  compile: ({ vars: [e = 0, t = 0], name: i, lang: n }) => o[n].def(i, `${e} > ${t}`)
}), Dt = a("xor", {
  tags: ["logic"],
  description: "returns 1 if exactly one of the inputs is 1",
  ins: [{ name: "a" }, { name: "b" }],
  compile: ({ vars: [e = 0, t = 0], name: i, lang: n }) => o[n].def(i, `${e} != ${t} ? 1 : 0`)
}), Lt = a("and", {
  tags: ["logic"],
  description: "returns 1 if both inputs are 1",
  ins: [{ name: "a" }, { name: "b" }],
  compile: ({ vars: [e = 0, t = 0], name: i, lang: n }) => o[n].def(i, `${e} && ${t} ? 1 : 0`)
}), Bt = a("or", {
  tags: ["logic"],
  description: "returns 1 if one or both inputs are 1",
  ins: [{ name: "a" }, { name: "b" }],
  compile: ({ vars: [e = 0, t = 0], name: i, lang: n }) => o[n].def(i, `${e} || ${t} ? 1 : 0`)
}), Wt = a("range", {
  tags: ["math"],
  description: "Scales the incoming bipolar value to the given range.",
  examples: ["sine(.5).range(.25,1).mul(sine(440)).out()"],
  ins: [{ name: "in" }, { name: "min" }, { name: "max" }],
  compile: ({ vars: e, name: t, lang: i }) => {
    const [n, s, r, l = 1] = e, x = `((${n} + 1) * 0.5)`, d = l === 1 ? x : o[i].pow(x, l);
    return o[i].def(t, `${d} * (${r} - ${s}) + ${s}`);
  }
}), Ft = a("remap", {
  ugen: "Remap",
  tags: ["math"],
  description: "Remaps input from one value range to another",
  ins: [
    { name: "in" },
    { name: "inmin" },
    { name: "inmax" },
    { name: "outmin" },
    { name: "outmax" }
  ],
  // examples: [`sine(440).abs().out()`],
  compile: ({
    vars: [e = 0, t = -1, i = 1, n = -1, s = 1],
    ...r
  }) => o[r.lang].defUgen(r, e, t, i, n, s)
}), Gt = a("thru", {
  compile: ({ name: e, vars: t, lang: i }) => o[i].def(e, t[0], "thru")
}), zt = h(
  "rangex",
  (e, t, i) => {
    let n = T(t), s = T(i).sub(n), l = e.unipolar().mul(s).add(n);
    return K(l);
  },
  {
    tags: ["math"],
    description: "exponential range",
    ins: [{ name: "in" }, { name: "min" }, { name: "max" }],
    examples: ["sine([1,3]).rangex(100, 2e3).sine().out()"]
  }
), Ht = a("midinote", {
  compile: ({ vars: [e], name: t, lang: i }) => o[i].def(t, o[i].midinote(e)),
  tags: ["math"],
  description: "convert midi number to frequency",
  ins: [{ name: "midi" }],
  examples: [
    `impulse(4).seq(0,3,7,12).add(60)
.midinote().sine().out()`
  ]
}), Yt = a("src", {
  internal: !0,
  compile: ({ vars: [e = 0], name: t, lang: i, ...n }) => o[i].def(t, n.getSource(e), `read source ${e}`)
}), Xt = a("output", {
  internal: !0,
  ugen: "Output",
  compile: ({ vars: [e, t = 0], name: i, lang: n, ...s }) => {
    const r = s.getOutput(t), l = s.getSource(t);
    return [
      o[n].def(r, [r, e].join(" + "), `+ output ${t}`),
      o[n].def(l, r, `write source ${t}`)
    ].join(`
`);
  }
}), ee = a("poly"), te = g(Math.PI), Vt = y(
  "fork",
  (e, t = 1) => ee(...Array.from({ length: t }, () => e.clone())),
  {
    ins: [{ name: "in" }, { name: "times" }],
    tags: ["multi-channel"],
    description: "split the signal into n channels",
    examples: ["dust(4).fork(2).adsr(.1).mul(sine(220)).out()"]
  }
), Jt = h("perc", (e, t) => e.adsr(0, 0, 1, t), {
  tags: ["envelope"],
  description: "percussive envelope. usable with triggers or gates",
  ins: [{ name: "gate" }, { name: "release" }],
  examples: ["impulse(4).perc(.1).mul( pink() ).out()"]
}), Kt = h(
  "hpf",
  (e, t, i = 0) => e.sub(e.lpf(t, i)),
  {
    ins: [{ name: "in" }, { name: "cutoff" }, { name: "reso" }],
    description: "high pass filter",
    tags: ["fx", "filter"],
    examples: ["tri([220,331,442]).mix().hpf(sine(.5).range(0,.9)).out()"]
  }
), Zt = h("lpf", J, {
  ins: [{ name: "in" }, { name: "cutoff" }, { name: "reso" }],
  description: "low pass filter",
  tags: ["fx", "filter"],
  examples: ["saw(55).lpf( sine(1).range(.4,.8) ).out()"]
}), Qt = a("bpf", {
  ugen: "BPF",
  ins: [{ name: "in" }, { name: "cutoff" }, { name: "reso" }],
  description: "high pass filter",
  tags: ["fx", "filter"],
  compile: ({ vars: [e = 0, t = 1, i = 0], ...n }) => o[n.lang].defUgen(n, e, t, i)
}), ei = h("lfnoise", (e) => X().hold(V(e)), {
  ins: [{ name: "freq" }],
  description: "low frequency stepped noise.",
  tags: ["regular", "noise"],
  examples: ["lfnoise(4).range(200,800).sine().out()"]
}), ti = h(
  "bipolar",
  (e) => g(e).mul(2).sub(1),
  {
    ins: [{ name: "in" }],
    description: "convert unipolar [0,1] signal to bipolar [-1,1]",
    tags: ["math"]
    // examples: [], // tbd
  }
), ii = h(
  "unipolar",
  (e) => g(e).add(1).div(2),
  {
    ins: [{ name: "in" }],
    description: "convert bipolar [-1,1] signal to unipolar [0,1]",
    tags: ["math"]
    // examples: [], // tbd
  }
), ni = h(
  "pan",
  (e, t) => (t = g(t).add(1).mul(te, 0.25), e.mul([Q(t), Z(t)])),
  {
    ins: [
      { name: "in" },
      {
        name: "pos",
        description: "bipolar position: -1 = left, 0 = center, 1 = right"
      }
    ],
    description: "pans signal to stereo position. splits signal path in 2",
    tags: ["multi-channel"],
    examples: ["sine(220).pan(sine(.25)).out()"]
  }
), si = a("pick", {
  tags: ["multi-channel"],
  ugen: "Pick",
  description: "Pick",
  ins: [{ name: "index" }, { name: "inputs", dynamic: !0 }],
  compile: ({ vars: e, ...t }) => o[t.lang].defUgen(t, ...e)
}), oi = a("clip", {
  tags: ["fx"],
  ugen: "Clip",
  description: "Hard limits the signal between lo and hi.",
  ins: [{ name: "input" }, { name: "lo" }, { name: "hi" }],
  compile: ({ vars: [e = 0, t = -1, i = 1], ...n }) => o[n.lang].defUgen(n, e, t, i)
}), ai = a("trig", {
  tags: ["trigger"],
  ugen: "Trig",
  description: "Emits a trigger impulse whenever the signal becomes positive. Useful to turn gates into triggers.",
  ins: [
    { name: "input", default: 0 },
    { name: "lo", default: -1 },
    { name: "hi", default: 1 }
  ],
  compile: ({ vars: [e = 0, t = -1, i = 1], ...n }) => o[n.lang].defUgen(n, e, t, i),
  examples: [
    `pulse(2)
.trig() // comment out to hear difference
.ar(.01,.2)
.mul(sine(200)).out()`
  ]
}), ri = y(
  "split",
  (e, t) => e.type !== "poly" ? t([e]) : t(e.ins),
  {
    ins: [{ name: "input" }, { name: "fn" }],
    tags: ["multi-channel"],
    description: "apply fn to an array of signals, one for each channel in input",
    examples: ["sine([220,330,550]).split(chs => add(...chs)).out()"]
  }
), li = y(
  "mix",
  (e, t = 1) => {
    if ([1, 2].includes(t) || (t = 2, console.warn("mix only supports 1 or 2 channels atm.. falling back to 2")), e.type !== "poly")
      return e;
    if (t === 2) {
      const i = e.ins.map((n, s, r) => {
        const x = (s / (r.length - 1) * 2 - 1 + 1) * Math.PI / 4;
        return n.mul([Math.cos(x), Math.sin(x)]).inherit(e);
      });
      return j(...i);
    }
    return e.ins = e.ins.map((i) => i.inherit(e)), $("mix").withIns(...e.ins);
  },
  {
    compile: ({ vars: e, name: t, lang: i }) => o[i].def(t, `(${e.join(" + ")})`),
    description: `mixes down multiple channels. Useful to make sure you get a mono or stereo signal out at the end. 
When mixing down to 2 channels, the input channels are equally distributed over the stereo image, e.g. 3 channels are panned [-1,0,1]`,
    ins: [
      { name: "in" },
      {
        name: "channels",
        default: 1,
        description: "how many channels to mix down to. Only supports 1 and 2"
      }
    ],
    tags: ["multi-channel"],
    examples: ["sine([220,330,440]).mix(2).out()"]
  }
);
u.prototype.feedback = function(e) {
  return this.add(e);
};
let ui = (e) => j(e), di = g, pi = g, ci = h("mouseX", () => N("mouseX"), {
  ins: [],
  description: "X position of mouse, bipolar range",
  tags: ["external"],
  examples: ["mouseX.range(100,800).sine().out()"]
}), mi = ci(), fi = h("mouseY", () => N("mouseY"), {
  ins: [],
  description: "Y position of mouse, bipolar range",
  tags: ["external"],
  examples: ["mouseY.range(800,100).sine().out()"]
}), gi = fi();
const L = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  B: di,
  PI: te,
  _: pi,
  abs: At,
  ad: st,
  add: j,
  adsr: it,
  and: Lt,
  ar: nt,
  argmax: qt,
  argmin: Rt,
  audioin: Ut,
  bipolar: ti,
  bpf: Qt,
  brown: ut,
  bytebeat: et,
  cc: N,
  clip: oi,
  clock: ot,
  clockdiv: at,
  cos: Q,
  delay: bt,
  distort: rt,
  div: Ct,
  dust: dt,
  exp: K,
  feedback: ui,
  filter: J,
  floatbeat: tt,
  fold: vt,
  fork: Vt,
  greater: Pt,
  hold: $t,
  hpf: Kt,
  impulse: V,
  lag: xt,
  lfnoise: ei,
  log: T,
  lpf: Zt,
  max: Et,
  midicc: Ot,
  midifreq: kt,
  midigate: _t,
  midinote: Ht,
  min: jt,
  mix: li,
  mod: It,
  mouseX: mi,
  mouseY: gi,
  mul: Mt,
  noise: X,
  or: Bt,
  output: Xt,
  pan: ni,
  perc: Jt,
  pick: si,
  pink: lt,
  poly: ee,
  pow: St,
  pulse: gt,
  range: Wt,
  rangex: zt,
  raw: Qe,
  registerUgen: Y,
  remap: Ft,
  round: Nt,
  saw: pt,
  seq: wt,
  sin: Z,
  sine: mt,
  slew: yt,
  slide: ht,
  split: ri,
  src: Yt,
  sub: Tt,
  thru: Gt,
  time: Ze,
  tri: ft,
  trig: ai,
  unipolar: ii,
  xor: Dt,
  zaw: ct
}, Symbol.toStringTag, { value: "Module" }));
class xi {
  constructor({
    onToggle: t,
    onToggleRecording: i,
    beforeEval: n,
    transpiler: s,
    localScope: r = !1
  } = {}) {
    this.audio = new Ne(), this.onToggle = t, this.transpiler = s, this.onToggleRecording = i, this.beforeEval = n, this.localScope = r, typeof window < "u" && (r || (Object.assign(globalThis, D), Object.assign(globalThis, L), Object.assign(globalThis, P), Object.assign(globalThis, { repl: this })), window.addEventListener("message", (l) => {
      l.data.type === "KABELSALAT_SET_CONTROL" && this.audio.setControl(l.data.id, l.data.value);
    }));
  }
  registerUgen(t, i) {
    return this.audio.registerUgen(i), Y(t, i.name);
  }
  evaluate(t) {
    this.localScope || (Object.assign(globalThis, { audio: this.audio }), Object.assign(globalThis, {
      addUgen: this.registerUgen.bind(this)
    }));
    let i;
    this.transpiler ? i = this.transpiler(t) : i = { output: t }, this.beforeEval?.(i);
    let n;
    return this.localScope && (n = {
      ...D,
      ...L,
      ...P,
      audio: this.audio,
      addUgen: this.registerUgen.bind(this),
      repl: this
    }), F(i.output, n);
  }
  async play(t) {
    await this.audio.init(), this.audio.updateGraph(t), this.onToggle?.(!0);
  }
  run(t) {
    const i = this.evaluate(t);
    this.play(i);
  }
  stop() {
    this.stopRecording(), this.audio.stop(), this.onToggle?.(!1);
  }
  record() {
    this.audio.record(), this.onToggleRecording?.(!0);
  }
  stopRecording() {
    this.audio.stopRecording(), this.onToggleRecording?.(!1);
  }
}
export {
  Ne as AudioView,
  di as B,
  u as Node,
  te as PI,
  xi as SalatRepl,
  pi as _,
  At as abs,
  st as ad,
  j as add,
  it as adsr,
  Lt as and,
  nt as ar,
  qt as argmax,
  Rt as argmin,
  Ut as audioin,
  ti as bipolar,
  Qt as bpf,
  ut as brown,
  et as bytebeat,
  N as cc,
  oi as clip,
  ot as clock,
  at as clockdiv,
  A as compile,
  Q as cos,
  bt as delay,
  rt as distort,
  Ct as div,
  dt as dust,
  F as evaluate,
  W as exit,
  K as exp,
  re as exportModule,
  ui as feedback,
  J as filter,
  tt as floatbeat,
  vt as fold,
  Vt as fork,
  oe as getInletName,
  B as getNode,
  Pt as greater,
  $t as hold,
  Kt as hpf,
  V as impulse,
  xt as lag,
  ei as lfnoise,
  T as log,
  Zt as lpf,
  Et as max,
  Ot as midicc,
  kt as midifreq,
  _t as midigate,
  Ht as midinote,
  jt as min,
  li as mix,
  It as mod,
  h as module,
  mi as mouseX,
  gi as mouseY,
  Mt as mul,
  g as n,
  $ as node,
  m as nodeRegistry,
  X as noise,
  Bt as or,
  Xt as output,
  ni as pan,
  Jt as perc,
  si as pick,
  lt as pink,
  ee as poly,
  St as pow,
  gt as pulse,
  Wt as range,
  zt as rangex,
  Qe as raw,
  y as register,
  a as registerNode,
  Y as registerUgen,
  Ft as remap,
  Nt as round,
  pt as saw,
  wt as seq,
  hi as signal,
  Z as sin,
  mt as sine,
  yt as slew,
  ht as slide,
  ri as split,
  Yt as src,
  Tt as sub,
  Gt as thru,
  Ze as time,
  ft as tri,
  ai as trig,
  ii as unipolar,
  Dt as xor,
  ct as zaw
};
