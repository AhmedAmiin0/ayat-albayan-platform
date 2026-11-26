import { asciiDigits } from '@ab/core';
import { COUNTRIES, type Country } from './countries';

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

/** The country a calling code («+44») stands for when several entries share it. */
export const mainCountryOf = (dial: string): Country | undefined =>
  OWNERS.find((c) => c.dial === dial);

/** Typed with «+» or «00»: a whole international number. */
export const isInternational = (typed: string): boolean => /^\s*(\+|00)/.test(asciiDigits(typed));

interface DialSplit {
  country: Country;
  /** The digits after the calling code. */
  national: string;
}

/** Picks the longest matching calling code, keeping a current country that shares it; else null. */
export function splitInternational(typed: string, current: Country): DialSplit | null {
  const whole = asciiDigits(typed).replace(/\D/g, '').replace(/^00/, '');
  const owner = isInternational(typed) ? ownerOf(whole) : undefined;
  if (owner === undefined) return null;
  const country = current.dial === owner.dial ? current : owner;
  return { country, national: whole.slice(owner.dial.length - 1) };
}
