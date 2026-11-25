import { z } from 'zod';

const sendOptionsSchema = z.strictObject({
  body: z.unknown().optional(),
  schema: z.instanceof(z.ZodType),
});

/** apiSend's third argument: `{ body?, schema }` options, or a plain JSON body as before. */
export function sendParts(arg: unknown): { body?: unknown; schema?: z.ZodType } {
  const options = sendOptionsSchema.safeParse(arg);
  return options.success ? options.data : { body: arg };
}
