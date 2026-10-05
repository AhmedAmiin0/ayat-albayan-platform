import { z } from 'zod';
import { E164_RE } from '../phone.js';
import type { ShapeField } from './types.js';

const FORMATS = {
  e164: E164_RE,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  host: /^(?=.{1,100}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i,
} as const;

function fieldZod(f: ShapeField): z.ZodType {
  let s = z.string().min(1).max(f.max ?? 500);
  if (f.format) s = s.regex(FORMATS[f.format]);
  return s.optional();
}

/** The object of a `json` entry: only its fields, each a non-empty string in its format. */
export function shapeZod(shape: readonly ShapeField[]): z.ZodType {
  return z.strictObject(Object.fromEntries(shape.map((f) => [f.name, fieldZod(f)])));
}

/** The same rule for a stored value (read side). */
export function shapeValid(shape: readonly ShapeField[], v: unknown): boolean {
  return shapeZod(shape).safeParse(v).success;
}
