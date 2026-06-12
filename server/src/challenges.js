// Challenge generators. Each returns { type, prompt, answer, hint }.
// `answer` is the canonical solution string; verification is done via
// normalize() so capitalization / whitespace don't matter.

function rand(max) {
  // inclusive 0..max
  return Math.floor(Math.random() * (max + 1));
}

function pick(arr) {
  return arr[rand(arr.length - 1)];
}

// ---- helpers -------------------------------------------------------------

function randIp() {
  return [rand(255), rand(255), rand(255), rand(255)];
}

function maskOctets(cidr) {
  // returns 4 octets of the netmask for a /8, /16, /24-style prefix
  const mask = [0, 0, 0, 0];
  let bits = cidr;
  for (let i = 0; i < 4; i++) {
    const take = Math.min(8, Math.max(0, bits));
    mask[i] = (256 - Math.pow(2, 8 - take)) & 255;
    bits -= 8;
  }
  return mask;
}

// ---- generators ----------------------------------------------------------

const WORD_POOL = [
  'override', 'mainframe', 'firewall', 'payload', 'kernel', 'exploit',
  'backdoor', 'sudo', 'packet', 'subnet', 'daemon', 'cipher', 'rootkit',
  'buffer', 'inject', 'spoof', 'proxy', 'handshake', 'bytecode', 'token',
];

const generators = {
  // Type the word as fast as you can.
  fastType() {
    const word = pick(WORD_POOL);
    return {
      type: 'fastType',
      prompt: `Type this word as fast as you can:  ${word}`,
      answer: word,
      hint: 'Just type the word exactly.',
    };
  },

  // Given IP / CIDR, find the network address.
  getNet() {
    const ip = randIp();
    const cidr = pick([8, 16, 24]);
    const mask = maskOctets(cidr);
    const network = ip.map((o, i) => o & mask[i]);
    return {
      type: 'getNet',
      prompt: `Network address of  ${ip.join('.')}/${cidr}  ?`,
      answer: network.join('.'),
      hint: 'AND the IP with the netmask.',
    };
  },

  // Broadcast address for an IP / CIDR.
  broadcast() {
    const ip = randIp();
    const cidr = pick([8, 16, 24]);
    const mask = maskOctets(cidr);
    const bcast = ip.map((o, i) => (o & mask[i]) | (~mask[i] & 255));
    return {
      type: 'broadcast',
      prompt: `Broadcast address of  ${ip.join('.')}/${cidr}  ?`,
      answer: bcast.join('.'),
      hint: 'Set all host bits to 1.',
    };
  },

  // Hex -> decimal (single hex digit, 0..15).
  hexToDec() {
    const n = rand(15);
    return {
      type: 'hexToDec',
      prompt: `Convert hex  0x${n.toString(16).toUpperCase()}  to decimal:`,
      answer: String(n),
      hint: 'A=10, B=11 … F=15.',
    };
  },

  // Decimal -> hex (single hex digit, 0..15).
  decToHex() {
    const n = rand(15);
    return {
      type: 'decToHex',
      prompt: `Convert decimal  ${n}  to hex (no 0x prefix):`,
      answer: n.toString(16),
      hint: '10=A, 11=B … 15=F.',
    };
  },

  // Binary -> decimal (4-bit nibble, 0..15).
  binToDec() {
    const n = rand(15);
    return {
      type: 'binToDec',
      prompt: `Convert binary  ${n.toString(2).padStart(4, '0')}  to decimal:`,
      answer: String(n),
      hint: 'Bits are 8, 4, 2, 1.',
    };
  },

  // Bitwise XOR of two nibbles (answer in decimal).
  xor() {
    const a = rand(15);
    const b = rand(15);
    return {
      type: 'xor',
      prompt: `Compute  ${a} XOR ${b}  (decimal):`,
      answer: String(a ^ b),
      hint: 'Bits differ -> 1.',
    };
  },
};

const ALL_TYPES = Object.keys(generators);

// Normalize an answer for comparison: trim, lowercase, collapse spaces,
// strip a leading 0x on hex-ish answers.
function normalize(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^0x/, '');
}

// Build a fresh challenge of a given type (or random if omitted).
function makeChallenge(type) {
  const t = type && generators[type] ? type : pick(ALL_TYPES);
  const c = generators[t]();
  return {
    id: `${t}-${rand(1e9)}`,
    type: c.type,
    prompt: c.prompt,
    hint: c.hint,
    _answer: c.answer, // server-only, never sent to clients
  };
}

function checkAnswer(challenge, value) {
  return normalize(challenge._answer) === normalize(value);
}

module.exports = { makeChallenge, checkAnswer, ALL_TYPES, normalize };
