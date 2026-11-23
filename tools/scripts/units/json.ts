import type { z } from 'zod';

const decode: (text: string) => unknown = JSON.parse;

/** The units tools' one JSON reader (docs/36 Z-2): text → value, through the caller's schema. */
export const parseJson = <T>(text: string, schema: z.ZodType<T>): T => schema.parse(decode(text));
