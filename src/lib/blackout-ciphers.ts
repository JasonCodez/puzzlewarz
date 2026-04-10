export type CipherType =
  | 'none'
  | 'anagram'
  | 'caesar'
  | 'numbers'
  | 'morse'
  | 'reverse'
  | 'atbash'
  | 'nato'
  | 'binary'
  | 'polybius'
  | 'phone'
  | 'vigenere'
  | 'hex'
  | 'ascii_decimal'
  | 'rail_fence'
  | 'keyboard';

/* ── Lookup tables ────────────────────────────────────────────────────────── */

const MORSE_MAP: Record<string, string> = {
  A: '.-',   B: '-...', C: '-.-.', D: '-..',  E: '.',    F: '..-.',
  G: '--.',  H: '....', I: '..',   J: '.---', K: '-.-',  L: '.-..',
  M: '--',   N: '-.',   O: '---',  P: '.--.',  Q: '--.-', R: '.-.',
  S: '...',  T: '-',    U: '..-',  V: '...-', W: '.--',  X: '-..-',
  Y: '-.--', Z: '--..',
};

const NATO_MAP: Record<string, string> = {
  A: 'ALPHA',   B: 'BRAVO',   C: 'CHARLIE', D: 'DELTA',   E: 'ECHO',
  F: 'FOXTROT', G: 'GOLF',    H: 'HOTEL',   I: 'INDIA',   J: 'JULIET',
  K: 'KILO',    L: 'LIMA',    M: 'MIKE',    N: 'NOVEMBER',O: 'OSCAR',
  P: 'PAPA',    Q: 'QUEBEC',  R: 'ROMEO',   S: 'SIERRA',  T: 'TANGO',
  U: 'UNIFORM', V: 'VICTOR',  W: 'WHISKEY', X: 'XRAY',    Y: 'YANKEE',
  Z: 'ZULU',
};

const POLYBIUS_MAP: Record<string, string> = {
  A:'11', B:'12', C:'13', D:'14', E:'15',
  F:'21', G:'22', H:'23', I:'24', J:'24',
  K:'25', L:'31', M:'32', N:'33', O:'34',
  P:'35', Q:'41', R:'42', S:'43', T:'44',
  U:'45', V:'51', W:'52', X:'53', Y:'54',
  Z:'55',
};

// Key: first digit = phone key, second digit = press count
const PHONE_MAP: Record<string, string> = {
  A:'21', B:'22', C:'23',
  D:'31', E:'32', F:'33',
  G:'41', H:'42', I:'43',
  J:'51', K:'52', L:'53',
  M:'61', N:'62', O:'63',
  P:'71', Q:'72', R:'73', S:'74',
  T:'81', U:'82', V:'83',
  W:'91', X:'92', Y:'93', Z:'94',
};

// QWERTY rows — each letter maps to the key one step to the right (wraps within row)
const KEYBOARD_MAP: Record<string, string> = {
  Q:'W', W:'E', E:'R', R:'T', T:'Y', Y:'U', U:'I', I:'O', O:'P', P:'Q',
  A:'S', S:'D', D:'F', F:'G', G:'H', H:'J', J:'K', K:'L', L:'A',
  Z:'X', X:'C', C:'V', V:'B', B:'N', N:'M', M:'Z',
};

/* ── Encode functions ─────────────────────────────────────────────────────── */

export function caesarEncode(text: string, shift: number): string {
  return text.toUpperCase().replace(/[A-Z]/g, c =>
    String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65)
  );
}

export function numberEncode(text: string): string {
  return text.toUpperCase().split('').map(c => {
    const code = c.charCodeAt(0) - 64;
    if (code >= 1 && code <= 26) return String(code).padStart(2, '0');
    if (c === ' ') return '/';
    return null;
  }).filter(Boolean).join(' · ');
}

export function morseEncode(text: string): string {
  return text.toUpperCase().split('').map(c => {
    if (c === ' ') return ' / ';
    return MORSE_MAP[c] ?? null;
  }).filter(Boolean).join('  ');
}

export function reverseEncode(text: string): string {
  return text.split('').reverse().join('');
}

export function atbashEncode(text: string): string {
  return text.toUpperCase().replace(/[A-Z]/g, c =>
    String.fromCharCode(90 - (c.charCodeAt(0) - 65))
  );
}

/** Deterministic scramble — same input always produces same scramble */
export function anagramEncode(text: string): string {
  const upper = text.toUpperCase();
  const chars = upper.split('');
  const seed  = (upper.charCodeAt(0) || 65) + upper.length * 3;
  for (let i = chars.length - 1; i > 0; i--) {
    const j = (seed * (i + 1) * 7 + i * 13) % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  if (chars.join('') === upper) chars.reverse();
  return chars.join('');
}

export function natoEncode(text: string): string {
  return text.toUpperCase().split('').map(c => {
    if (c === ' ') return '/';
    return NATO_MAP[c] ?? null;
  }).filter(Boolean).join(' · ');
}

export function binaryEncode(text: string): string {
  return text.toUpperCase().split('').map(c => {
    if (c === ' ') return '/';
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return code.toString(2).padStart(8, '0');
    return null;
  }).filter(Boolean).join(' ');
}

export function polybiusEncode(text: string): string {
  return text.toUpperCase().split('').map(c => {
    if (c === ' ') return '/';
    return POLYBIUS_MAP[c] ?? null;
  }).filter(Boolean).join('  ');
}

export function phoneEncode(text: string): string {
  return text.toUpperCase().split('').map(c => {
    if (c === ' ') return '/';
    return PHONE_MAP[c] ?? null;
  }).filter(Boolean).join(' · ');
}

export function vigenereEncode(text: string, key: string): string {
  const k = key.toUpperCase().replace(/[^A-Z]/g, '') || 'KEY';
  let ki = 0;
  return text.toUpperCase().replace(/[A-Z]/g, c => {
    const shift = k.charCodeAt(ki % k.length) - 65;
    ki++;
    return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65);
  });
}

export function hexEncode(text: string): string {
  return text.toUpperCase().split('').map(c => {
    if (c === ' ') return '/';
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return code.toString(16).toUpperCase();
    return null;
  }).filter(Boolean).join(' ');
}

export function asciiDecimalEncode(text: string): string {
  return text.toUpperCase().split('').map(c => {
    if (c === ' ') return '/';
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String(code);
    return null;
  }).filter(Boolean).join(' · ');
}

export function railFenceEncode(text: string): string {
  const upper = text.toUpperCase().replace(/[^A-Z]/g, '');
  const top: string[] = [];
  const bottom: string[] = [];
  upper.split('').forEach((c, i) => {
    if (i % 2 === 0) top.push(c);
    else bottom.push(c);
  });
  return top.join('') + ' // ' + bottom.join('');
}

export function keyboardEncode(text: string): string {
  return text.toUpperCase().split('').map(c =>
    KEYBOARD_MAP[c] ?? c
  ).join('');
}

/* ── Master dispatcher ────────────────────────────────────────────────────── */

export function getEncodedClue(
  placeholder: string,
  cipherType: CipherType,
  cipherShift = 13,
  cipherKey = 'KEY',
): string {
  if (!placeholder) return '';
  switch (cipherType) {
    case 'caesar':        return caesarEncode(placeholder, cipherShift);
    case 'numbers':       return numberEncode(placeholder);
    case 'morse':         return morseEncode(placeholder);
    case 'reverse':       return reverseEncode(placeholder);
    case 'atbash':        return atbashEncode(placeholder);
    case 'anagram':       return anagramEncode(placeholder);
    case 'nato':          return natoEncode(placeholder);
    case 'binary':        return binaryEncode(placeholder);
    case 'polybius':      return polybiusEncode(placeholder);
    case 'phone':         return phoneEncode(placeholder);
    case 'vigenere':      return vigenereEncode(placeholder, cipherKey);
    case 'hex':           return hexEncode(placeholder);
    case 'ascii_decimal': return asciiDecimalEncode(placeholder);
    case 'rail_fence':    return railFenceEncode(placeholder);
    case 'keyboard':      return keyboardEncode(placeholder);
    default:              return '';
  }
}

/* ── Labels & instructions ────────────────────────────────────────────────── */

export function getCipherLabel(cipherType: CipherType, cipherShift = 13, cipherKey = 'KEY'): string {
  switch (cipherType) {
    case 'caesar':        return `CAESAR CIPHER  //  KEY = ${cipherShift}`;
    case 'numbers':       return 'NUMBER CODE  //  A=01, B=02 …';
    case 'morse':         return 'MORSE CODE  //  INTL STANDARD';
    case 'reverse':       return 'REVERSE CIPHER';
    case 'atbash':        return 'ATBASH  //  A↔Z  B↔Y  C↔X';
    case 'anagram':       return 'ANAGRAM';
    case 'nato':          return 'NATO PHONETIC  //  A=ALPHA';
    case 'binary':        return 'BINARY  //  8-BIT ASCII';
    case 'polybius':      return 'POLYBIUS SQUARE  //  ROW·COL';
    case 'phone':         return 'PHONE KEYPAD  //  KEY·PRESS';
    case 'vigenere':      return `VIGENÈRE CIPHER  //  KEY = ${cipherKey.toUpperCase()}`;
    case 'hex':           return 'HEX CODE  //  ASCII';
    case 'ascii_decimal': return 'ASCII DECIMAL  //  A=65';
    case 'rail_fence':    return 'RAIL FENCE  //  2 RAILS';
    case 'keyboard':      return 'QWERTY SHIFT  //  RIGHT ONE KEY';
    default:              return 'CONTEXT ONLY';
  }
}

export function getCipherInstruction(cipherType: CipherType): string {
  switch (cipherType) {
    case 'caesar':
      return 'Shift each letter BACK by the key number.  (D→A when KEY=3)';
    case 'numbers':
      return 'Convert each number to its letter.  01=A · 02=B · 26=Z  |  / = space';
    case 'morse':
      return 'Decode each signal. Letters separated by two spaces; words by a slash (/).';
    case 'reverse':
      return 'Read the character sequence in reverse order.';
    case 'atbash':
      return 'Mirror the alphabet: A becomes Z, B becomes Y, and so on.  It is its own inverse — apply it again to decode.';
    case 'anagram':
      return 'Rearrange all the letters to form the original word or phrase.';
    case 'nato':
      return 'Take the FIRST letter of each NATO code word.  (ALPHA=A · BRAVO=B …)  Slash (/) separates words.';
    case 'binary':
      return 'Each group of 8 digits is a binary number. Convert to decimal, then to a letter (65=A, 66=B … 90=Z).';
    case 'polybius':
      return 'Each pair of digits is ROW then COLUMN in a 5×5 grid. Row 1 = A–E, Row 2 = F–J (I=J), Row 3 = K–O, Row 4 = P–T, Row 5 = U–Z.';
    case 'phone':
      return 'First digit = phone key (2=ABC, 3=DEF, 4=GHI, 5=JKL, 6=MNO, 7=PQRS, 8=TUV, 9=WXYZ). Second digit = which letter on that key (1st, 2nd, 3rd…).';
    case 'vigenere':
      return 'For each letter, subtract the position of the matching key letter (A=0, B=1…). Repeat the key word across the message.';
    case 'hex':
      return 'Each hex value is the ASCII code for a letter in hexadecimal. 41=A, 42=B … 5A=Z.';
    case 'ascii_decimal':
      return 'Each number is the ASCII decimal code for a letter. 65=A, 66=B, 67=C … 90=Z.';
    case 'rail_fence':
      return 'Text was written in a zigzag over 2 rails, then read rail by rail. Left of // is the top rail (even positions); right of // is the bottom rail (odd positions). Interleave them to decode.';
    case 'keyboard':
      return 'Each letter was shifted one key to the RIGHT on a QWERTY keyboard. Shift each letter one position BACK to the left to decode.';
    default:
      return 'No cipher — deduce the answer from the surrounding text.';
  }
}

/* ── Dropdown options ─────────────────────────────────────────────────────── */

export const CIPHER_OPTIONS: { value: CipherType; label: string }[] = [
  { value: 'none',          label: 'None (context only)' },
  { value: 'anagram',       label: 'Anagram' },
  { value: 'ascii_decimal', label: 'ASCII Decimal (A=65)' },
  { value: 'atbash',        label: 'Atbash (A↔Z)' },
  { value: 'binary',        label: 'Binary (8-bit)' },
  { value: 'caesar',        label: 'Caesar Cipher' },
  { value: 'hex',           label: 'Hex Code (ASCII)' },
  { value: 'keyboard',      label: 'QWERTY Shift (right)' },
  { value: 'morse',         label: 'Morse Code' },
  { value: 'nato',          label: 'NATO Phonetic' },
  { value: 'numbers',       label: 'Number Code (A=01)' },
  { value: 'phone',         label: 'Phone Keypad' },
  { value: 'polybius',      label: 'Polybius Square' },
  { value: 'rail_fence',    label: 'Rail Fence (2 rails)' },
  { value: 'reverse',       label: 'Reverse' },
  { value: 'vigenere',      label: 'Vigenère Cipher' },
];
