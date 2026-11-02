import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { jsonOf } from './json.js';

const point = jsonOf(z.object({ x: z.number() }));

describe('jsonOf', () => {
  it('parses the text, then checks it with the schema', () => {
    expect(point.parse('{"x":1,"y":2}')).toEqual({ x: 1 });
  });

  it.each(['', '{', 'undefined', "{'x':1}"])('%j is not JSON: invalid_json', (text) => {
    const result = point.safeParse(text);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual(['invalid_json']);
  });

  it('JSON of the wrong shape fails the inner schema', () => {
    expect(point.safeParse('{"x":"1"}').success).toBe(false);
    expect(point.safeParse('null').success).toBe(false);
    expect(point.safeParse('[1]').success).toBe(false);
  });

  it('a non-string input fails before parsing', () => {
    expect(point.safeParse({ x: 1 }).success).toBe(false);
  });
});
