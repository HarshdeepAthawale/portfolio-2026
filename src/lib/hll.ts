// HyperLogLog compatible with Redis: same hash (MurmurHash64A, seed 0xadc83b19), same
// 16384 six-bit registers and the same estimator. That lets visitor counts migrated
// from Redis keep counting exactly where they left off. Only registers are stored,
// never the visitor ids themselves.

const P = 14;
export const HLL_REGISTERS = 1 << P; // 16384
const Q = 64 - P;
const MASK64 = (BigInt("1") << BigInt("64")) - BigInt("1");
const M = BigInt("0xc6a4a7935bd1e995");
const R = BigInt("47");

function murmur64A(bytes: Uint8Array, seed = BigInt("0xadc83b19")) {
  let h = (seed ^ ((BigInt(bytes.length) * M) & MASK64)) & MASK64;
  const blocks = bytes.length >> 3;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < blocks; i++) {
    let k = view.getBigUint64(i * 8, true);
    k = (k * M) & MASK64;
    k ^= k >> R;
    k = (k * M) & MASK64;
    h ^= k;
    h = (h * M) & MASK64;
  }
  const tail = bytes.length & 7;
  const base = blocks * 8;
  if (tail) {
    for (let i = tail - 1; i >= 0; i--) h ^= BigInt(bytes[base + i]) << BigInt(8 * i);
    h = (h * M) & MASK64;
  }
  h ^= h >> R;
  h = (h * M) & MASK64;
  h ^= h >> R;
  return h;
}

/** Register index and run length for a member, exactly as Redis computes them. */
function position(member: string) {
  const hash = murmur64A(new TextEncoder().encode(member));
  const index = Number(hash & BigInt(HLL_REGISTERS - 1));
  let rest = (hash >> BigInt(P)) | (BigInt("1") << BigInt(Q)); // sentinel bit caps the count
  let count = 1;
  while ((rest & BigInt("1")) === BigInt("0")) {
    count++;
    rest >>= BigInt("1");
  }
  return { index, count };
}

/** Adds members; returns true if any register changed. */
export function hllAdd(registers: Uint8Array, members: string[]) {
  let changed = false;
  for (const member of members) {
    const { index, count } = position(member);
    if (count > registers[index]) {
      registers[index] = count;
      changed = true;
    }
  }
  return changed;
}

export function hllMerge(target: Uint8Array, source: Uint8Array) {
  for (let i = 0; i < HLL_REGISTERS; i++) if (source[i] > target[i]) target[i] = source[i];
}

function tau(x: number) {
  if (x === 0 || x === 1) return 0;
  let y = 1;
  let z = 1 - x;
  let previous: number;
  do {
    x = Math.sqrt(x);
    previous = z;
    y *= 0.5;
    z -= (1 - x) ** 2 * y;
  } while (previous !== z);
  return z / 3;
}

function sigma(x: number) {
  if (x === 1) return Infinity;
  let y = 1;
  let z = x;
  let previous: number;
  do {
    x *= x;
    previous = z;
    z += x * y;
    y += y;
  } while (previous !== z);
  return z;
}

/** Cardinality estimate (Ertl's estimator, as used by Redis). */
export function hllCount(registers: Uint8Array) {
  const histogram = new Array<number>(Q + 2).fill(0);
  for (let i = 0; i < HLL_REGISTERS; i++) histogram[registers[i]]++;
  const m = HLL_REGISTERS;
  let z = m * tau((m - histogram[Q + 1]) / m);
  for (let j = Q; j >= 1; j--) {
    z += histogram[j];
    z *= 0.5;
  }
  z += m * sigma(histogram[0] / m);
  return Math.round((0.5 / Math.log(2)) * m * m / z);
}

/** Decodes a Redis HLL value (dense or sparse encoding) into registers. */
export function hllFromRedis(raw: Uint8Array) {
  const registers = new Uint8Array(HLL_REGISTERS);
  if (String.fromCharCode(...raw.subarray(0, 4)) !== "HYLL") throw new Error("Not a Redis HyperLogLog");
  const encoding = raw[4];
  const body = raw.subarray(16);
  if (encoding === 0) {
    for (let i = 0; i < HLL_REGISTERS; i++) {
      const bit = i * 6;
      const byte = bit >> 3;
      const shift = bit & 7;
      registers[i] = ((body[byte] >> shift) | ((body[byte + 1] ?? 0) << (8 - shift))) & 63;
    }
    return registers;
  }
  let index = 0;
  for (let i = 0; i < body.length && index < HLL_REGISTERS; i++) {
    const op = body[i];
    if ((op & 0xc0) === 0x00) index += (op & 0x3f) + 1; // ZERO
    else if ((op & 0xc0) === 0x40) index += (((op & 0x3f) << 8) | body[++i]) + 1; // XZERO
    else {
      const value = ((op >> 2) & 0x1f) + 1; // VAL
      const run = (op & 0x03) + 1;
      for (let r = 0; r < run && index < HLL_REGISTERS; r++) registers[index++] = value;
    }
  }
  return registers;
}
