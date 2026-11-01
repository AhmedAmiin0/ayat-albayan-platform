import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { lenientLabel, lenientString, lenientText, parseOrNull } from './lenient.js';

describe('lenient fields', () => {
  it('lenientText: a non-empty string, else undefined', () => {
    expect(lenientText.parse('a')).toBe('a');
    expect(lenientText.parse(' ')).toBe(' ');
    expect(lenientText.parse('')).toBeUndefined();
    expect(lenientText.parse(3)).toBeUndefined();
    expect(lenientText.parse(undefined)).toBeUndefined();
  });

  it('lenientLabel: more than blanks, kept as sent', () => {
    expect(lenientLabel.parse(' نعم ')).toBe(' نعم ');
    expect(lenientLabel.parse('  ')).toBeUndefined();
    expect(lenientLabel.parse(null)).toBeUndefined();
  });

  it('lenientString: any string, else undefined', () => {
    expect(lenientString.parse('')).toBe('');
    expect(lenientString.parse({})).toBeUndefined();
  });

  it('a lenient field never fails its object', () => {
    const schema = z.looseObject({ name: lenientText });
    expect(schema.parse({ name: 5, other: 1 })).toEqual({ name: undefined, other: 1 });
  });
});

describe('parseOrNull', () => {
  it('the parsed value, or null on a mismatch', () => {
    expect(parseOrNull(z.number(), 2)).toBe(2);
    expect(parseOrNull(z.number(), '2')).toBeNull();
  });
});
