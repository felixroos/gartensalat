// this is watr @2.4.1
// https://github.com/dy/watr
// https://www.npmjs.com/package/watr
// encoding ref: https://github.com/j-s-n/WebBS/blob/master/compiler/byteCode.js

// uleb
const uleb = (n, buffer = []) => {
  if (n == null) return buffer
  if (typeof n === 'string') n = i32.parse(n);

  let byte = n & 0b01111111;
  n = n >>> 7;

  if (n === 0) {
    buffer.push(byte);
    return buffer;
  } else {
    buffer.push(byte | 0b10000000);
    return uleb(n, buffer);
  }
};

// leb
function i32(n, buffer = []) {
  if (typeof n === 'string') n = i32.parse(n);

  while (true) {
    const byte = Number(n & 0x7F);
    n >>= 7;
    if ((n === 0 && (byte & 0x40) === 0) || (n === -1 && (byte & 0x40) !== 0)) {
      buffer.push(byte);
      break
    }
    buffer.push((byte | 0x80));
  }
  return buffer
}
// alias
const i8 = i32, i16 = i32;

i32.parse = n => parseInt(n.replaceAll('_', ''));

// bigleb
function i64(n, buffer = []) {
  if (typeof n === 'string') n = i64.parse(n);

  while (true) {
    const byte = Number(n & 0x7Fn);
    n >>= 7n;
    if ((n === 0n && (byte & 0x40) === 0) || (n === -1n && (byte & 0x40) !== 0)) {
      buffer.push(byte);
      break
    }
    buffer.push((byte | 0x80));
  }
  return buffer
}
i64.parse = n => {
  n = n.replaceAll('_', '');
  n = n[0] === '-' ? -BigInt(n.slice(1)) : BigInt(n);
  byteView.setBigInt64(0, n);
  return n = byteView.getBigInt64(0)
};

const byteView = new DataView(new BigInt64Array(1).buffer);

const F32_SIGN = 0x80000000, F32_NAN = 0x7f800000;
function f32(input, value, idx) {
  if (~(idx = input.indexOf('nan:'))) {
    value = i32.parse(input.slice(idx + 4));
    value |= F32_NAN;
    if (input[0] === '-') value |= F32_SIGN;
    byteView.setInt32(0, value);
  }
  else {
    value = typeof input === 'string' ? f32.parse(input) : input;
    byteView.setFloat32(0, value);
  }

  return [
    byteView.getUint8(3),
    byteView.getUint8(2),
    byteView.getUint8(1),
    byteView.getUint8(0)
  ];
}

const F64_SIGN = 0x8000000000000000n, F64_NAN = 0x7ff0000000000000n;
function f64(input, value, idx) {
  if (~(idx = input.indexOf('nan:'))) {
    value = i64.parse(input.slice(idx + 4));
    value |= F64_NAN;
    if (input[0] === '-') value |= F64_SIGN;
    byteView.setBigInt64(0, value);
  }
  else {
    value = typeof input === 'string' ? f64.parse(input) : input;
    byteView.setFloat64(0, value);
  }

  return [
    byteView.getUint8(7),
    byteView.getUint8(6),
    byteView.getUint8(5),
    byteView.getUint8(4),
    byteView.getUint8(3),
    byteView.getUint8(2),
    byteView.getUint8(1),
    byteView.getUint8(0)
  ];
}

f32.parse = f64.parse = input => {
  if (input.includes('nan')) return input[0] === '-' ? -NaN : NaN;
  if (input.includes('inf')) return input[0] === '-' ? -Infinity : Infinity;

  input = input.replaceAll('_', '');

  // 0x1.5p3
  if (input.includes('0x')) {
    let [sig, exp] = input.split(/p/i), [dec, fract] = sig.split('.'), sign = dec[0] === '-' ? -1 : 1;
    sig = parseInt(dec) * sign + (fract ? parseInt(fract, 16) / (16 ** fract.length) : 0);
    return sign * (exp ? sig * 2 ** parseInt(exp, 10) : sig);
  }

  return parseFloat(input)
};

const encode = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  f32,
  f64,
  i16,
  i32,
  i64,
  i8,
  uleb
}, Symbol.toStringTag, { value: 'Module' }));

// https://webassembly.github.io/spec/core/appendix/index-instructions.html
const INSTR = [
  'unreachable', 'nop', 'block:b', 'loop:b', 'if:b', 'else', 'then', , , , ,
  'end', 'br:i', 'br_if:i', 'br_table:i*', 'return', 'call:i', 'call_indirect:i:i', , , , , , , , ,
  'drop', 'select', 'select2:t', , , ,
  'local.get:i', 'local.set:i', 'local.tee:i', 'global.get:i', 'global.set:i', 'table.get:i', 'table.set:i', ,
  'i32.load:m', 'i64.load:m', 'f32.load:m', 'f64.load:m',
  'i32.load8_s:m', 'i32.load8_u:m', 'i32.load16_s:m', 'i32.load16_u:m',
  'i64.load8_s:m', 'i64.load8_u:m', 'i64.load16_s:m', 'i64.load16_u:m', 'i64.load32_s:m', 'i64.load32_u:m',
  'i32.store:m', 'i64.store:m', 'f32.store:m', 'f64.store:m',
  'i32.store8:m', 'i32.store16:m', 'i64.store8:m', 'i64.store16:m', 'i64.store32:m',
  'memory.size', 'memory.grow',
  'i32.const:n', 'i64.const:n', 'f32.const:n', 'f64.const:n',
  'i32.eqz', 'i32.eq', 'i32.ne', 'i32.lt_s', 'i32.lt_u', 'i32.gt_s', 'i32.gt_u', 'i32.le_s', 'i32.le_u', 'i32.ge_s', 'i32.ge_u',
  'i64.eqz', 'i64.eq', 'i64.ne', 'i64.lt_s', 'i64.lt_u', 'i64.gt_s', 'i64.gt_u', 'i64.le_s', 'i64.le_u', 'i64.ge_s', 'i64.ge_u',
  'f32.eq', 'f32.ne', 'f32.lt', 'f32.gt', 'f32.le', 'f32.ge',
  'f64.eq', 'f64.ne', 'f64.lt', 'f64.gt', 'f64.le', 'f64.ge',
  'i32.clz', 'i32.ctz', 'i32.popcnt', 'i32.add', 'i32.sub', 'i32.mul', 'i32.div_s', 'i32.div_u', 'i32.rem_s', 'i32.rem_u', 'i32.and', 'i32.or', 'i32.xor', 'i32.shl', 'i32.shr_s', 'i32.shr_u', 'i32.rotl', 'i32.rotr',
  'i64.clz', 'i64.ctz', 'i64.popcnt', 'i64.add', 'i64.sub', 'i64.mul', 'i64.div_s', 'i64.div_u', 'i64.rem_s', 'i64.rem_u', 'i64.and', 'i64.or', 'i64.xor', 'i64.shl', 'i64.shr_s', 'i64.shr_u', 'i64.rotl', 'i64.rotr',
  'f32.abs', 'f32.neg', 'f32.ceil', 'f32.floor', 'f32.trunc', 'f32.nearest', 'f32.sqrt', 'f32.add', 'f32.sub', 'f32.mul', 'f32.div', 'f32.min', 'f32.max', 'f32.copysign',
  'f64.abs', 'f64.neg', 'f64.ceil', 'f64.floor', 'f64.trunc', 'f64.nearest', 'f64.sqrt', 'f64.add', 'f64.sub', 'f64.mul', 'f64.div', 'f64.min', 'f64.max', 'f64.copysign',
  'i32.wrap_i64',
  'i32.trunc_f32_s', 'i32.trunc_f32_u', 'i32.trunc_f64_s', 'i32.trunc_f64_u', 'i64.extend_i32_s', 'i64.extend_i32_u',
  'i64.trunc_f32_s', 'i64.trunc_f32_u', 'i64.trunc_f64_s', 'i64.trunc_f64_u',
  'f32.convert_i32_s', 'f32.convert_i32_u', 'f32.convert_i64_s', 'f32.convert_i64_u', 'f32.demote_f64',
  'f64.convert_i32_s', 'f64.convert_i32_u', 'f64.convert_i64_s', 'f64.convert_i64_u', 'f64.promote_f32',
  'i32.reinterpret_f32', 'i64.reinterpret_f64', 'f32.reinterpret_i32', 'f64.reinterpret_i64',
  'i32.extend8_s', 'i32.extend16_s', 'i64.extend8_s', 'i64.extend16_s', 'i64.extend32_s', , , , , , , , , , , ,
  'ref.null:t', 'ref.is_null', 'ref.func:i', , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , , ,

  // 0xFC 0xNN (0xfc shift)
  'i32.trunc_sat_f32_u', 'i32.trunc_sat_f32_u', 'i32.trunc_sat_f64_s', 'i32.trunc_sat_f64_u', 'i64.trunc_sat_f32_s', 'i64.trunc_sat_f32_u', 'i64.trunc_sat_f64_s', 'i64.trunc_sat_f64_u',
  'memory.init:i', 'data.drop:i', 'memory.copy', 'memory.fill', 'table.init:i:i', 'elem.drop:i', 'table.copy:i:i', 'table.grow:i', 'table.size:i', 'table.fill:i', ,

  // 0xFD 0xNN (0x10f shift)
  'v128.load:m', 'v128.load8x8_s:m', 'v128.load8x8_u:m', 'v128.load16x4_s:m', 'v128.load16x4_u:m', 'v128.load32x2_s:m', 'v128.load32x2_u:m', 'v128.load8_splat:m', 'v128.load16_splat:m', 'v128.load32_splat:m', 'v128.load64_splat:m', 'v128.store:m', 'v128.const:n', 'i8x16.shuffle:n:n:n:n:n:n:n:n:n:n:n:n:n:n:n:n',
  'i8x16.swizzle', 'i8x16.splat', 'i16x8.splat', 'i32x4.splat', 'i64x2.splat', 'f32x4.splat', 'f64x2.splat',
  'i8x16.extract_lane_s:n', 'i8x16.extract_lane_u:n', 'i8x16.replace_lane:n', 'i16x8.extract_lane_s:n', 'i16x8.extract_lane_u:n', 'i16x8.replace_lane:n', 'i32x4.extract_lane:n', 'i32x4.replace_lane:n', 'i64x2.extract_lane:n', 'i64x2.replace_lane:n', 'f32x4.extract_lane:n', 'f32x4.replace_lane:n', 'f64x2.extract_lane:n', 'f64x2.replace_lane:n',
  'i8x16.eq', 'i8x16.ne', 'i8x16.lt_s', 'i8x16.lt_u', 'i8x16.gt_s', 'i8x16.gt_u', 'i8x16.le_s', 'i8x16.le_u', 'i8x16.ge_s', 'i8x16.ge_u', 'i16x8.eq', 'i16x8.ne', 'i16x8.lt_s', 'i16x8.lt_u', 'i16x8.gt_s', 'i16x8.gt_u', 'i16x8.le_s', 'i16x8.le_u', 'i16x8.ge_s', 'i16x8.ge_u', 'i32x4.eq', 'i32x4.ne', 'i32x4.lt_s', 'i32x4.lt_u', 'i32x4.gt_s', 'i32x4.gt_u', 'i32x4.le_s', 'i32x4.le_u', 'i32x4.ge_s', 'i32x4.ge_u', 'f32x4.eq', 'f32x4.ne', 'f32x4.lt', 'f32x4.gt', 'f32x4.le', 'f32x4.ge', 'f64x2.eq', 'f64x2.ne', 'f64x2.lt', 'f64x2.gt', 'f64x2.le', 'f64x2.ge', 'v128.not', 'v128.and', 'v128.andnot', 'v128.or', 'v128.xor', 'v128.bitselect', 'v128.any_true',
  'v128.load8_lane:m:l', 'v128.load16_lane:m:l', 'v128.load32_lane:m:l', 'v128.load64_lane:m:l', 'v128.store8_lane', 'v128.store16_lane', 'v128.store32_lane', 'v128.store64_lane', 'v128.load32_zero:m', 'v128.load64_zero:m', 'f32x4.demote_f64x2_zero', 'f64x2.promote_low_f32x4',
  'i8x16.abs', 'i8x16.neg', 'i8x16.popcnt', 'i8x16.all_true', 'i8x16.bitmask', 'i8x16.narrow_i16x8_s', 'i8x16.narrow_i16x8_u', 'f32x4.ceil', 'f32x4.floor', 'f32x4.trunc', 'f32x4.nearest', 'i8x16.shl', 'i8x16.shr_s', 'i8x16.shr_u', 'i8x16.add', 'i8x16.add_sat_s', 'i8x16.add_sat_u', 'i8x16.sub', 'i8x16.sub_sat_s', 'i8x16.sub_sat_u', 'f64x2.ceil', 'f64x2.floor', 'i8x16.min_s', 'i8x16.min_u', 'i8x16.max_s', 'i8x16.max_u', 'f64x2.trunc', 'i8x16.avgr_u',
  'i16x8.extadd_pairwise_i8x16_s', 'i16x8.extadd_pairwise_i8x16_u', 'i32x4.extadd_pairwise_i16x8_s', 'i32x4.extadd_pairwise_i16x8_u', 'i16x8.abs', 'i16x8.neg', 'i16x8.q15mulr_sat_s', 'i16x8.all_true', 'i16x8.bitmask', 'i16x8.narrow_i32x4_s', 'i16x8.narrow_i32x4_u', 'i16x8.extend_low_i8x16_s', 'i16x8.extend_high_i8x16_s', 'i16x8.extend_low_i8x16_u', 'i16x8.extend_high_i8x16_u',
  'i16x8.shl', 'i16x8.shr_s', 'i16x8.shr_u', 'i16x8.add', 'i16x8.add_sat_s', 'i16x8.add_sat_u', 'i16x8.sub', 'i16x8.sub_sat_s', 'i16x8.sub_sat_u', 'f64x2.nearest', 'i16x8.mul', 'i16x8.min_s', 'i16x8.min_u', 'i16x8.max_s', 'i16x8.max_u', , 'i16x8.avgr_u',
  'i16x8.extmul_low_i8x16_s', 'i16x8.extmul_high_i8x16_s', 'i16x8.extmul_low_i8x16_u', 'i16x8.extmul_high_i8x16_u', 'i32x4.abs', 'i32x4.neg', , 'i32x4.all_true', 'i32x4.bitmask', , , 'i32x4.extend_low_i16x8_s', 'i32x4.extend_high_i16x8_s', 'i32x4.extend_low_i16x8_u', 'i32x4.extend_high_i16x8_u', 'i32x4.shl', 'i32x4.shr_s', 'i32x4.shr_u', 'i32x4.add', , , 'i32x4.sub', , , , 'i32x4.mul', 'i32x4.min_s', 'i32x4.min_u', 'i32x4.max_s', 'i32x4.max_u', 'i32x4.dot_i16x8_s', , 'i32x4.extmul_low_i16x8_s', 'i32x4.extmul_high_i16x8_s', 'i32x4.extmul_low_i16x8_u', 'i32x4.extmul_high_i16x8_u', 'i64x2.abs', 'i64x2.neg', , 'i64x2.all_true', 'i64x2.bitmask', , , 'i64x2.extend_low_i32x4_s', 'i64x2.extend_high_i32x4_s', 'i64x2.extend_low_i32x4_u', 'i64x2.extend_high_i32x4_u', 'i64x2.shl', 'i64x2.shr_s', 'i64x2.shr_u', 'i64x2.add', , , 'i64x2.sub', , , , 'i64x2.mul', 'i64x2.eq', 'i64x2.ne', 'i64x2.lt_s', 'i64x2.gt_s', 'i64x2.le_s', 'i64x2.ge_s', 'i64x2.extmul_low_i32x4_s', 'i64x2.extmul_high_i32x4_s', 'i64x2.extmul_low_i32x4_u', 'i64x2.extmul_high_i32x4_u', 'f32x4.abs', 'f32x4.neg', , 'f32x4.sqrt', 'f32x4.add', 'f32x4.sub', 'f32x4.mul', 'f32x4.div', 'f32x4.min', 'f32x4.max', 'f32x4.pmin', 'f32x4.pmax', 'f64x2.abs', 'f64x2.neg', , 'f64x2.sqrt', 'f64x2.add', 'f64x2.sub', 'f64x2.mul', 'f64x2.div', 'f64x2.min', 'f64x2.max', 'f64x2.pmin', 'f64x2.pmax', 'i32x4.trunc_sat_f32x4_s', 'i32x4.trunc_sat_f32x4_u', 'f32x4.convert_i32x4_s', 'f32x4.convert_i32x4_u', 'i32x4.trunc_sat_f64x2_s_zero', 'i32x4.trunc_sat_f64x2_u_zero', 'f64x2.convert_low_i32x4_s', 'f64x2.convert_low_i32x4_u'
],
  SECTION = { custom: 0, type: 1, import: 2, func: 3, table: 4, memory: 5, global: 6, export: 7, start: 8, elem: 9, code: 10, data: 11, datacount: 12 },
  TYPE = { i32: 0x7f, i64: 0x7e, f32: 0x7d, f64: 0x7c, void: 0x40, v128: 0x7B, func: 0x60, funcref: 0x70, externref: 0x6F, extern: 0x6f },
  KIND = { func: 0, table: 1, memory: 2, global: 3 },
  // FIXME: replace with formula
  ALIGN = {
    'i32.load': 4, 'i64.load': 8, 'f32.load': 4, 'f64.load': 8,
    'i32.load8_s': 1, 'i32.load8_u': 1, 'i32.load16_s': 2, 'i32.load16_u': 2,
    'i64.load8_s': 1, 'i64.load8_u': 1, 'i64.load16_s': 2, 'i64.load16_u': 2, 'i64.load32_s': 4, 'i64.load32_u': 4, 'i32.store': 4,
    'i64.store': 8, 'f32.store': 4, 'f64.store': 8,
    'i32.store8': 1, 'i32.store16': 2, 'i64.store8': 1, 'i64.store16': 2, 'i64.store32': 4,

    'v128.load': 16, 'v128.load8x8_s': 8, 'v128.load8x8_u': 8, 'v128.load16x4_s': 8, 'v128.load16x4_u': 8, 'v128.load32x2_s': 8, 'v128.load32x2_u': 8, 'v128.load8_splat': 1, 'v128.load16_splat': 2, 'v128.load32_splat': 4, 'v128.load64_splat': 8, 'v128.store': 16,
    'v128.load': 16,

    'v128.load8_lane': 1, 'v128.load16_lane': 2, 'v128.load32_lane': 4, 'v128.load64_lane': 8, 'v128.store8_lane': 1, 'v128.store16_lane': 2, 'v128.store32_lane': 4, 'v128.store64_lane': 8, 'v128.load32_zero': 4, 'v128.load64_zero': 8
  };

const OPAREN = 40, CPAREN = 41, SPACE = 32, DQUOTE = 34, SEMIC = 59;

/**
 * Parses a wasm text string and constructs a nested array structure (AST).
 *
 * @param {string} str - The input string with WAT code to parse.
 * @returns {Array} An array representing the nested syntax tree (AST).
 */
const parse = (str) => {
  let i = 0, level = [], buf = '';

  const commit = () => buf && (
    level.push(buf),
    buf = ''
  );

  const parseLevel = () => {
    for (let c, root; i < str.length;) {

      c = str.charCodeAt(i);
      if (c === DQUOTE) commit(), buf = str.slice(i++, i = str.indexOf('"', i) + 1), commit();
      else if (c === OPAREN) {
        if (str.charCodeAt(i + 1) === SEMIC) i = str.indexOf(';)', i) + 2; // (; ... ;)
        else commit(), i++, (root = level).push(level = []), parseLevel(), level = root;
      }
      else if (c === SEMIC) i = str.indexOf('\n', i) + 1 || str.length;  // ; ...
      else if (c <= SPACE) commit(), i++;
      else if (c === CPAREN) return commit(), i++
      else buf += str[i++];
    }

    commit();
  };

  parseLevel();

  return level.length > 1 ? level : level[0]
};

// build instructions index
INSTR.forEach((instr, i) => {
  let [op, ...imm] = instr.split(':');

  // TODO
  // wrap codes
  // const code = i >= 0x10f ? [0xfd, i - 0x10f] : i >= 0xfc ? [0xfc, i - 0xfc] : i
  INSTR[op] = i;

  // // handle immediates
  // INSTR[op] = !imm.length ? () => code :
  //   imm.length === 1 ? (a = immedname(imm[0]), nodes => [...code, ...a(nodes)]) :
  //     (imm = imm.map(immedname), nodes => [...code, ...imm.flatMap(imm => imm(nodes))])
});


/**
 * Converts a WebAssembly Text Format (WAT) tree to a WebAssembly binary format (WASM).
 *
 * @param {string|Array} nodes - The WAT tree or string to be compiled to WASM binary.
 * @returns {Uint8Array} The compiled WASM binary data.
 */
const compile = (nodes) => {
  // normalize to (module ...) form
  if (typeof nodes === 'string') nodes = parse(nodes); else nodes = [...nodes];
  if (nodes[0] === 'module') nodes.shift();
  else if (typeof nodes[0] === 'string') nodes = [nodes];

  // (module $id? ...)
  nodes[0]?.[0] === '$' && nodes.shift();

  // Scopes are stored directly on section array by key, eg. section.func.$name = idx
  // FIXME: make direct binary instead
  const sections = {
    type: [], import: [], func: [], table: [], memory: [], global: [], export: [], start: [], elem: [], code: [], data: []
  };
  const binary = [
    0x00, 0x61, 0x73, 0x6d, // magic
    0x01, 0x00, 0x00, 0x00, // version
  ];

  // directly map nodes to binary sections
  while (nodes.length) {
    let [kind, ...node] = nodes.shift();

    // get name reference
    let name = node[0]?.[0] === '$' && node.shift();

    // export abbr
    // (table|memory|global|func id? (export n)* ...) -> (table|memory|global|func id ...) (export n (table|memory|global|func id))
    // NOTE: we call direct export to simplify loop through and make order match wabt
    while (node[0]?.[0] === 'export') sections.export.push(build.export([node.shift()[1], [kind, sections[kind].length]]));

    // import abbr
    // (table|memory|global|func id? (import m n) type) -> (import m n (table|memory|global|func id? type))
    if (node[0]?.[0] === 'import') {
      node = [...node.shift(), [kind, ...(name ? [name] : []), ...node]], kind = node.shift();
    }

    // table abbr
    // (table id? reftype (elem ...{n})) -> (table id? n n reftype) (elem (table id) (i32.const 0) reftype ...)
    if (node[1]?.[0] === 'elem') {
      let [reftype, [, ...els]] = node;
      node = [els.length, els.length, reftype];
      nodes.unshift(['elem', ['table', name || sections[kind].length], ['i32.const', '0'], typeof els[0] === 'string' ? 'func' : reftype, ...els]);
    }

    // duplicate func as code section
    // FIXME: func can buid binary right away if we insert refs properly
    if (kind === 'func') nodes.push(['code', ...node]);

    // workaround start
    else if (name && kind === 'start') node.push(sections.func[name]);

    // figure out section id
    let idx = sections[kind].length;

    // if section name was referenced before - use existing id, else assign idx to name
    if (name) name in sections[kind] ? idx = sections[kind][name] : sections[kind][name] = idx;

    // build into corresponding idx
    sections[kind][idx] = build[kind](node, sections);
  }

  // build binary
  for (let name in sections) {
    let items = sections[name], secCode = SECTION[name], bytes = [], count = 0;
    for (let item of items) {
      if (!item) continue // ignore empty items (like import placeholders)
      count++; // count number of items in section
      bytes.push(...item);
    }
    // ignore empty sections
    if (!bytes.length) continue
    // skip start section count - write length
    if (secCode !== 8) bytes.unshift(...uleb(count));
    binary.push(secCode, ...vec(bytes));
  }

  return new Uint8Array(binary)
};

// build section binary (non consuming)
const build = {
  // (type $id? (func params result))
  type([fn], ctx) {
    let [, ...sig] = fn || [], [params, result] = paramres(sig);
    return [TYPE.func, ...vec(params.map(t => TYPE[t])), ...vec(result.map(t => TYPE[t]))]
  },

  // (import "math" "add" (func|table|global|memory $name? typedef?))
  import([mod, field, [kind, ...parts]], ctx) {
    let nm = parts[0]?.[0] === '$' && parts.shift(), details;

    // create stub
    if (nm[0] === '$') ctx[kind][nm] = ctx[kind].length;
    ctx[kind].length++; // inc counter

    if (kind === 'func') {
      // we track imported funcs in func section to share namespace, and skip them on final build
      let [typeIdx] = typeuse(parts, ctx);
      details = uleb(typeIdx);
    }
    else if (kind === 'memory') {
      details = limits(parts);
    }
    else if (kind === 'global') {
      let [type] = parts, mut = type[0] === 'mut' ? 1 : 0;
      details = [TYPE[mut ? type[1] : type], mut];
    }
    else if (kind === 'table') {
      details = [TYPE[parts.pop()], ...limits(parts)];
    }

    return ([...str(mod), ...str(field), KIND[kind], ...details])
  },

  // (func $name? ...params result ...body)
  func(body, ctx) {
    const [typeidx] = typeuse(body, ctx);

    // register new function
    return uleb(typeidx)
  },

  // (table id? 1 2? funcref)
  table(args, ctx) {
    return [TYPE[args.pop()], ...limits(args)]
  },

  // (memory id? export* min max shared)
  memory(args, ctx) {
    return limits(args)
  },

  // (global id? i32 (i32.const 42))
  // (global $id (mut i32) (i32.const 42))
  global(args, ctx) {
    let [type] = args, mut = type[0] === 'mut' ? 1 : 0;

    let [, [...init]] = args;
    return [TYPE[mut ? type[1] : type], mut, ...expr(init, ctx), 0x0b]
  },

  //  (export "name" (func|table|mem $name|idx))
  export([s, [kind, nm]], ctx) {
    // put placeholder to future-init
    let idx = nm[0] === '$' ? ctx[kind][nm] ??= ctx[kind].length++ : +nm;
    return [...str(s), KIND[kind], ...uleb(idx)]
  },

  // (start $main)
  start([id], ctx) {
    // FIXME: can be resolved later
    // FIXME: do away with name
    return uleb(+id)
  },

  // ref: https://webassembly.github.io/spec/core/binary/modules.html#element-section
  // passive
  // (elem elem*)
  // declarative
  // (elem declare elem*)
  // active
  // (elem (table idx)? (offset expr)|(expr) elem*)
  // elems
  // funcref|externref (item expr)|expr (item expr)|expr
  // func? $id0 $id1
  elem(parts, ctx) {
    let tabidx, offset, mode = 0b000, reftype;

    // declare?
    if (parts[0] === 'declare') parts.shift(), mode |= 0b010;

    // table?
    if (parts[0][0] === 'table') {
      [, tabidx] = parts.shift();
      tabidx = tabidx[0] === '$' ? (ctx.table[tabidx] ??= ctx.table.length++) : +tabidx;
      // ignore table=0
      if (tabidx) mode |= 0b010;
    }

    // (offset expr)|expr
    if (parts[0]?.[0] === 'offset' || (Array.isArray(parts[0]) && parts[0][0] !== 'item' && !parts[0][0].startsWith('ref'))) {
      [...offset] = parts.shift();
      if (offset[0] === 'offset') [, [...offset]] = offset;
    }
    else mode |= 0b001; // passive

    // funcref|externref|func
    if (parts[0] === 'func') parts.shift();
    else if (parts[0] === 'funcref') reftype = parts.shift(), mode |= 0b100;
    // NOTE: externref makes explicit table index (in wabt/browser, but not in standard)
    else if (parts[0] === 'externref') reftype = parts.shift(), offset ||= ['i32.const', 0], mode = 0b110;

    // reset to simplest mode if no actual elements
    if (!parts.length) mode &= 0b011;

    return ([
      mode,
      ...(
        // 0b000 e:expr y*:vec(funcidx)                     | type=funcref, init ((ref.func y)end)*, active (table=0,offset=e)
        mode === 0b000 ? [...expr(offset, ctx), 0x0b] :
          // 0b001 et:elkind y*:vec(funcidx)                  | type=0x00, init ((ref.func y)end)*, passive
          mode === 0b001 ? [0x00] :
            // 0b010 x:tabidx e:expr et:elkind y*:vec(funcidx)  | type=0x00, init ((ref.func y)end)*, active (table=x,offset=e)
            mode === 0b010 ? [...uleb(tabidx || 0), ...expr(offset), 0x0b, 0x00] :
              // 0b011 et:elkind y*:vec(funcidx)                  | type=0x00, init ((ref.func y)end)*, passive declare
              mode === 0b011 ? [0x00] :
                // 0b100 e:expr el*:vec(expr)                       | type=funcref, init el*, active (table=0, offset=e)
                mode === 0b100 ? [...expr(offset, ctx), 0x0b] :
                  // 0b101 et:reftype el*:vec(expr)                   | type=et, init el*, passive
                  mode === 0b101 ? [TYPE[reftype]] :
                    // 0b110 x:tabidx e:expr et:reftype el*:vec(expr)   | type=et, init el*, active (table=x, offset=e)
                    mode === 0b110 ? [...uleb(tabidx || 0), ...expr(offset), 0x0b, TYPE[reftype]] :
                      // 0b111 et:reftype el*:vec(expr)                   | type=et, init el*, passive declare
                      [TYPE[reftype]]
      ),
      ...uleb(parts.length),
      ...parts.flatMap(el => (
        typeof el === 'string' ?
          // $id0 1 2
          uleb(el[0] === '$' ? (ctx.func[el] ??= ctx.func.length++) : +el) :
          // (ref.func a) (item (ref.func 2)) (item ref.func 2)
          [...expr(el[0] === 'item' ? (el.length > 2 ? el.slice(1) : [...el[1]]) : [...el], ctx), 0x0b]
      ))
    ])
  },

  // FIXME: artificial section, can be handled via func
  // (code params ...body)
  code(body, ctx) {
    const [, params] = typeuse(body, ctx);
    let blocks = []; // control instructions / blocks stack
    let locals = []; // list of local variables

    // collect locals
    while (body[0]?.[0] === 'local') {
      let [, ...types] = body.shift(), name;
      if (types[0][0] === '$')
        params[name = types.shift()] ? err('Ambiguous name ' + name) : // FIXME: not supposed to happen
          locals[name] = params.length + locals.length;
      locals.push(...types.map(t => TYPE[t]));
    }

    // convert sequence of instructions from input nodes to out bytes
    const consume = (nodes, out = []) => {
      if (!nodes?.length) return out

      let op = nodes.shift(), opCode, args = nodes, immed, id, group;

      // flatten groups, eg. (cmd z w) -> z w cmd
      if (group = Array.isArray(op)) {
        args = [...op]; // op is immutable
        opCode = INSTR[op = args.shift()];
      }
      else opCode = INSTR[op];

      // v128s: (v128.load x) etc
      // https://github.com/WebAssembly/simd/blob/master/proposals/simd/BinarySIMD.md
      if (opCode >= 0x10f) {
        opCode -= 0x10f;
        immed = [0xfd, ...uleb(opCode)];
        // (v128.load)
        if (opCode <= 0x0b) {
          const o = memarg(args);
          immed.push(Math.log2(o.align ?? ALIGN[op]), ...uleb(o.offset ?? 0));
        }
        // (v128.load_lane offset? align? idx)
        else if (opCode >= 0x54 && opCode <= 0x5d) {
          const o = memarg(args);
          immed.push(Math.log2(o.align ?? ALIGN[op]), ...uleb(o.offset ?? 0));
          // (v128.load_lane_zero)
          if (opCode <= 0x5b) immed.push(...uleb(args.shift()));
        }
        // (i8x16.shuffle 0 1 ... 15 a b)
        else if (opCode === 0x0d) {
          // i8, i16, i32 - bypass the encoding
          for (let i = 0; i < 16; i++) immed.push(i32.parse(args.shift()));
        }
        // (v128.const i32x4)
        else if (opCode === 0x0c) {
          args.unshift(op);
          immed = expr(args, ctx);
        }
        // (i8x16.extract_lane_s 0 ...)
        else if (opCode >= 0x15 && opCode <= 0x22) {
          immed.push(...uleb(args.shift()));
        }
        opCode = null; // ignore opcode
      }

      // bulk memory: (memory.init) (memory.copy) etc
      // https://github.com/WebAssembly/bulk-memory-operations/blob/master/proposals/bulk-memory-operations/Overview.md#instruction-encoding
      else if (opCode >= 0xfc) {
        immed = [0xfc, ...uleb(opCode -= 0xfc)];
        // memory.init idx, memory.drop idx, table.init idx, table.drop idx
        if (!(opCode & 0b10)) immed.push(...uleb(args.shift()));
        else immed.push(0);
        // even opCodes (memory.init, memory.copy, table.init, table.copy) have 2nd predefined immediate
        if (!(opCode & 0b1)) immed.push(0);
        opCode = null; // ignore opcode
      }

      // ref.func $id
      else if (opCode == 0xd2) {
        immed = uleb(args[0][0] === '$' ? (ctx.func[args.shift()] ??= ctx.func.length++) : +args.shift());
      }
      // ref.null
      else if (opCode == 0xd0) {
        immed = [TYPE[args.shift() + 'ref']]; // func->funcref, extern->externref
      }

      // binary/unary (i32.add a b) - no immed
      else if (opCode >= 0x45) ;

      // (i32.store align=n offset=m at value) etc
      else if (opCode >= 0x28 && opCode <= 0x3e) {
        // FIXME: figure out point in Math.log2 aligns
        let o = memarg(args);
        immed = [Math.log2(o.align ?? ALIGN[op]), ...uleb(o.offset ?? 0)];
      }

      // (i32.const 123), (f32.const 123.45) etc
      else if (opCode >= 0x41 && opCode <= 0x44) {
        immed = encode[op.split('.')[0]](args.shift());
      }

      // (local.get $id), (local.tee $id x)
      else if (opCode >= 0x20 && opCode <= 0x22) {
        immed = uleb(args[0]?.[0] === '$' ? params[id = args.shift()] ?? locals[id] ?? err('Unknown local ' + id) : +args.shift());
      }

      // (global.get $id), (global.set $id)
      else if (opCode == 0x23 || opCode == 0x24) {
        immed = uleb(args[0]?.[0] === '$' ? ctx.global[args.shift()] ??= ctx.global.length++ : +args.shift());
      }

      // (call id ...nodes)
      else if (opCode == 0x10) {
        let fnName = args.shift();
        immed = uleb(id = fnName[0] === '$' ? ctx.func[fnName] ?? err('Unknown func ' + fnName) : +fnName);
        // FIXME: how to get signature of imported function
      }

      // (call_indirect tableIdx? (type $typeName) (idx) ...nodes)
      else if (opCode == 0x11) {
        let tableidx = args[0]?.[0] === '$' ? ctx.table[args.shift()] ??= ctx.table.length++ : 0;
        let [typeidx] = typeuse(args, ctx);
        // let typeidx = args.shift()[1];
        // typeidx = typeidx[0] === '$' ? ctx.type[typeidx] ?? err('Unknown type ' + typeidx) : +typeidx
        immed = [...uleb(typeidx), ...uleb(tableidx)];
      }

      // (block ...), (loop ...), (if ...)
      else if (opCode === 2 || opCode === 3 || opCode === 4) {
        blocks.push(opCode);

        // (block $x) (loop $y)
        if (opCode < 4 && args[0]?.[0] === '$') (blocks[args.shift()] = blocks.length);

        // get type - can be either typeidx or valtype (numtype | reftype)
        // (result i32) - doesn't require registering type
        if (args[0]?.[0] === 'result' && args[0].length < 3) {
          let [, type] = args.shift();
          immed = [TYPE[type]];
        }
        // (result i32 i32)
        else if (args[0]?.[0] === 'result' || args[0]?.[0] === 'param') {
          let [typeidx] = typeuse(args, ctx);
          immed = [typeidx];
        }
        else {
          immed = [TYPE.void];
        }

        if (group) {
          // (block xxx) -> block xxx end
          nodes.unshift('end');

          if (opCode < 4) while (args.length) nodes.unshift(args.pop());
          // (if cond a) -> cond if a end
          else if (args.length < 3) nodes.unshift(args.pop());
          // (if cond (then a) (else b)) -> `cond if a else b end`
          else {
            nodes.unshift(args.pop());
            // (if cond a b) -> (if cond a else b)
            if (nodes[0][0] !== 'else') nodes.unshift('else');
            // (if a b (else)) -> (if a b)
            else if (nodes[0].length < 2) nodes.shift();
            nodes.unshift(args.pop());
          }
        }
      }

      // (else)
      else if (opCode === 5) {
        // (else xxx) -> else xxx
        if (group) while (args.length) nodes.unshift(args.pop());
      }
      // (then)
      else if (opCode === 6) {
        opCode = null; // ignore opcode
      }

      // (end)
      else if (opCode == 0x0b) blocks.pop();

      // (br $label result?)
      // (br_if $label cond result?)
      else if (opCode == 0x0c || opCode == 0x0d) {
        // br index indicates how many block items to pop
        immed = uleb(args[0]?.[0] === '$' ? blocks.length - blocks[args.shift()] : args.shift());
      }

      // (br_table 1 2 3 4  0  selector result?)
      else if (opCode == 0x0e) {
        immed = [];
        while (!Array.isArray(args[0])) id = args.shift(), immed.push(...uleb(id[0][0] === '$' ? blocks.length - blocks[id] : id));
        immed.unshift(...uleb(immed.length - 1));
      }

      // FIXME multiple memory (memory.grow $idx?)
      else if (opCode == 0x3f || opCode == 0x40) {
        immed = [0];
      }

      // (table.get $id)
      else if (opCode == 0x25 || opCode == 0x26) {
        immed = uleb(args[0]?.[0] === '$' ? ctx.table[args.shift()] ??= ctx.table.length++ : +args.shift());
      }

      // table.grow id, table.size id, table.fill id
      else if (opCode >= 0x0f && opCode <= 0x11) {
        immed = [];
      }

      else if (opCode == null) err(`Unknown instruction \`${op}\``);

      // if group (cmd im1 im2 arg1 arg2) - insert any remaining args first: arg1 arg2
      // because inline case has them in stack already
      if (group) while (args.length) consume(args, out);

      if (opCode) out.push(opCode);
      if (immed) out.push(...immed);
    };

    const bytes = [];
    while (body.length) consume(body, bytes);
    bytes.push(0x0b);

    // squash locals into (n:u32 t:valtype)*, n is number and t is type
    let loctypes = locals.reduce((a, type) => (type == a[a.length - 1]?.[1] ? a[a.length - 1][0]++ : a.push([1, type]), a), []);

    // https://webassembly.github.io/spec/core/binary/modules.html#code-section
    return vec([...uleb(loctypes.length), ...loctypes.flatMap(([n, t]) => [...uleb(n), t]), ...bytes])
  },

  // (data (i32.const 0) "\aa" "\bb"?)
  // (data (offset (i32.const 0)) (memory ref) "\aa" "\bb"?)
  // (data (global.get $x) "\aa" "\bb"?)
  data(inits, ctx) {
    let offset, mem;

    if (inits[0]?.[0] === 'offset') [, offset] = inits.shift();
    if (inits[0]?.[0] === 'memory') [, mem] = inits.shift();
    if (inits[0]?.[0] === 'offset') [, offset] = inits.shift();
    if (!offset && !mem) offset = inits.shift();
    if (!offset) offset = ['i32.const', 0];

    return [0, ...expr([...offset], ctx), 0x0b, ...str(inits.map(i => i[0] === '"' ? i.slice(1, -1) : i).join(''))]
  }
};

// serialize binary array
const vec = a => [...uleb(a.length), ...a];

// instantiation time const initializer (consuming)
const expr = (node, ctx) => {
  let op = node.shift(), [type, cmd] = op.split('.');

  // (global.get idx)
  if (type === 'global') return [0x23, ...uleb(node[0][0] === '$' ? ctx.global[node[0]] ??= ctx.global.length++ : +node)]

  // (v128.const i32x4 1 2 3 4)
  if (type === 'v128') return [0xfd, 0x0c, ...v128(node)]

  // (i32.const 1)
  if (cmd === 'const') return [0x41 + ['i32', 'i64', 'f32', 'f64'].indexOf(type), ...encode[type](node[0])]

  // (ref.func $x) or (ref.null func|extern)
  if (type === 'ref') {
    return cmd === 'func' ?
      [0xd2, ...uleb(node[0][0] === '$' ? (ctx.func[node[0]] ??= ctx.func.length++) : +node)] :
      // heaptype
      [0xd0, TYPE[node[0] + 'ref']] // func->funcref, extern->externref
  }

  // (i32.add a b), (i32.mult a b) etc
  return [
    ...expr(node.shift(), ctx),
    ...expr(node.shift(), ctx),
    INSTR[op]
  ]
};

// (v128.const i32x4 1 2 3 4)
const v128 = (args) => {
  let [t, n] = args.shift().split('x'),
    stride = t.slice(1) >>> 3; // i16 -> 2, f32 -> 4

  n = +n;

  // i8, i16, i32 - bypass the encoding
  if (t[0] === 'i') {
    let arr = n === 16 ? new Uint8Array(16) : n === 8 ? new Uint16Array(8) : n === 4 ? new Uint32Array(4) : new BigInt64Array(2);
    for (let i = 0; i < n; i++) {
      arr[i] = encode[t].parse(args.shift());
    }
    return new Uint8Array(arr.buffer)
  }

  // f32, f64 - encode
  let arr = new Uint8Array(16);
  for (let i = 0; i < n; i++) {
    arr.set(encode[t](args.shift()), i * stride);
  }

  return arr
};

// https://webassembly.github.io/spec/core/text/modules.html#type-uses
// consume (type id)(param t+)* (result t+)*
const typeuse = (nodes, ctx) => {
  let idx;

  // existing type (type 0), (type $name) - can repeat params, result after
  if (nodes[0]?.[0] === 'type') {
    [, idx] = nodes.shift();
    idx = idx[0] === '$' ? ctx.type[idx] ?? err('Unknown type ' + idx) : +idx;
  }

  let [params, result] = paramres(nodes);

  // if new type, not (type 0) (...) - try reusing or adding new
  if (idx == null) {
    let b = build.type([[, ['param', ...params], ['result', ...result]]]);
    idx = ctx.type.findIndex(
      a => a.length === b.length && a.join('') === b.join('')
    );

    if (idx < 0) idx = ctx.type.push(b) - 1;
  }

  return [idx, params, result]
};

// consume (param t+)* (result t+)* sequence
const paramres = (nodes) => {
  let params = [], result = [];

  // collect params (param i32 i64) (param $x? i32)
  while (nodes[0]?.[0] === 'param') {
    let [, ...args] = nodes.shift();
    let name = args[0]?.[0] === '$' && args.shift();
    if (name) params[name] = params.length; // expose name refs
    params.push(...args);
  }

  // collect result eg. (result f64 f32)(result i32)
  while (nodes[0]?.[0] === 'result') {
    let [, ...args] = nodes.shift();
    result.push(...args);
  }

  return [params, result]
};

// consume align/offset/etc params
const memarg = (args) => {
  let params = {}, param;
  while (args[0]?.includes('=')) param = args.shift().split('='), params[param[0]] = Number(param[1]);
  return params
};

// escape codes
const escape = { n: 10, r: 13, t: 9, v: 1, '\\': 92 };

// build string binary
const str = str => {
  str = str[0] === '"' ? str.slice(1, -1) : str;
  let res = [], i = 0, c, BSLASH = 92;
  // https://webassembly.github.io/spec/core/text/values.html#strings
  for (; i < str.length;) {
    c = str.charCodeAt(i++);
    res.push(c === BSLASH ? escape[str[i++]] || parseInt(str.slice(i - 1, ++i), 16) : c);
  }

  return vec(res)
};

// build limits sequence (non-consuming)
const limits = ([min, max, shared]) => isNaN(parseInt(max)) ? [0, ...uleb(min)] : [shared === 'shared' ? 3 : 1, ...uleb(min), ...uleb(max)];

const err = text => { throw Error(text) };

let indent = '', newline = '\n';

/**
 * Formats a tree or a WAT string.
 *
 * @param {string | Array} tree - The code to print. If a string is provided, it will be parsed first.
 * @param {Object} [options] - Printing options.
 * @param {string} [options.indent='  '] - The string used for one level of indentation.
 * @param {string} [options.newline='\n'] - The string used for line breaks.
 * @returns {string} The formatted WAT string.
 */
function print(tree, options = {}) {
  if (typeof tree === 'string') tree = parse(tree);

  ({ indent='  ', newline='\n' } = options);
  indent ||= '', newline ||= '';

  return typeof tree[0] === 'string' ? printNode(tree) : tree.map(node => printNode(node)).join(newline)
}

const INLINE = [
  'param',
  'local',
  'drop',
  'f32.const',
  'f64.const',
  'i32.const',
  'i64.const',
  'local.get',
  'global.get',
  'memory.size',
  'result',
  'export',
  'unreachable',
  'nop'
];

function printNode(node, level = 0) {
  if (!Array.isArray(node)) return node + ''

  let content = node[0];

  for (let i = 1; i < node.length; i++) {
    // new node doesn't need space separator, eg. [x,[y]] -> `x(y)`
    if (Array.isArray(node[i])) {
      // inline nodes like (param x)(param y)
      // (func (export "xxx")..., but not (func (export "a")(param "b")...

      if (
        INLINE.includes(node[i][0]) &&
        (!Array.isArray(node[i - 1]) || INLINE.includes(node[i - 1][0]))
      ) {
        if (!Array.isArray(node[i - 1])) content += ` `;
      } else {
        content += newline;
        if (node[i]) content += indent.repeat(level + 1);
      }

      content += printNode(node[i], level + 1);
    }
    else {
      content += ` `;
      content += node[i];
    }
  }
  return `(${content})`
}

/**
 * WebAssembly Text Format (WAT) compiler, parser, printer.
 *
 * @module watr
 */

export { compile, compile as default, parse, print };
