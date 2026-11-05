import { randomBytes } from 'node:crypto';

// The short code: 10 base62 characters from crypto random (≈59.5 bits), drawn by rejection so every
// character is equally likely. Unguessable enough for links that open one lesson's pages, which are
// themselves guarded by their own signed token.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const CODE_LENGTH = 10;
/** 62 × 4 = 248: a byte ≥ 248 is drawn again, so the modulo is unbiased. */
const LIMIT = ALPHABET.length * 4;
const CODE_RE = /^[A-Za-z0-9]{8,32}$/;

export function newShortCode(random: (n: number) => Buffer = randomBytes): string {
  let code = '';
  while (code.length < CODE_LENGTH) {
    const fair = [...random(CODE_LENGTH * 2)].filter((b) => b < LIMIT);
    code += fair.map((b) => ALPHABET.charAt(b % ALPHABET.length)).join('');
  }
  return code.slice(0, CODE_LENGTH);
}

/** False for anything that cannot be one of ours: no database call is made for it. */
export const looksLikeShortCode = (code: string): boolean => CODE_RE.test(code);
