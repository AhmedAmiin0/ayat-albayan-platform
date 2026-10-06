import { randomInt } from 'node:crypto';

// No look-alike characters (0/O, 1/l/I): the password is read out or typed from a WhatsApp message.
const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GENERATED_LENGTH = 16;

/** A random password of at least the configured minimum, with a letter and a digit. Never logged. */
export function generatePassword(min: number, pick: (n: number) => number = randomInt): string {
  const length = Math.max(GENERATED_LENGTH, min);
  const chars = Array.from({ length }, () => ALPHABET.charAt(pick(ALPHABET.length)));
  if (!/\d/.test(chars.join(''))) chars[0] = '7';
  if (!/[a-zA-Z]/.test(chars.join(''))) chars[1] = 'k';
  return chars.join('');
}
