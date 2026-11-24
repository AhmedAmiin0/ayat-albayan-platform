import { asciiDigits } from '@ab/core';
import { COUNTRIES, type Country } from './countries.js';

/** The main country of a shared calling code (+1 → US, +7 → RU, +44 → GB…). */
const MAIN = new Set(['US', 'RU', 'GB', 'NO', 'AU', 'RE', 'GP', 'CW', 'MA', 'FI', 'IT', 'NZ', 'FK']);
const isMain = (c: Country) => MAIN.has(c.code);

/** Each calling code once, with its main country (a later entry wins), the longest code first. */
const OWNERS = [
  ...new Map(
    [...COUNTRIES.filter((c) => !isMain(c)), ...COUNTRIES.filter(isMain)].map((c) => [c.dial, c]),
  ).values(),
].sort((a, b) => b.dial.length - a.dial.length);

const ownerOf = (whole: string) => OWNERS.find((c) => whole.startsWith(c.dial.slice(1)));

/** Typed with «+» or «00»: a whole international number. */
export const isInternational = (typed: string): boolean => /^\s*(\+|00)/.test(asciiDigits(typed));

interface DialSplit {
  country: Country;
  /** The digits after the calling code. */
  national: string;
}

/**
 * A whole number pasted, autofilled or typed with + / 00 («+44 7700…», «0044…», «+٤٤…»): its
 * country by the longest calling code it starts with, and the national digits. The current
 * country stays when it shares the code (Canada keeps +1). null: not international, or no code yet.
 */
export function splitInternational(typed: string, current: Country): DialSplit | null {
  const whole = asciiDigits(typed).replace(/\D/g, '').replace(/^00/, '');
  const owner = isInternational(typed) ? ownerOf(whole) : undefined;
  if (owner === undefined) return null;
  const country = current.dial === owner.dial ? current : owner;
  return { country, national: whole.slice(owner.dial.length - 1) };
}
