import { z } from 'zod';

// docs/36 Z-2: the one place a JSON string becomes data. Every reader pipes it into its own schema,
// so no caller runs JSON.parse or checks the shape by hand.

/** A JSON string → its value; text that is not JSON is the issue `invalid_json`. */
const jsonText = z.string().transform((text, ctx): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'invalid_json' });
    return z.NEVER;
  }
});

/** `jsonOf(schema).safeParse(text)`: the text parsed as JSON, then checked by `schema`. */
export function jsonOf<S extends z.ZodType>(schema: S): z.ZodPipe<typeof jsonText, S> {
  return jsonText.pipe(schema);
}
