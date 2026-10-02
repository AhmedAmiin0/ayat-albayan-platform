import type { Json } from '@ab/db';
import { QUICK_REPLY_INTENTS, type TemplateButton, type TemplateParams } from '@ab/shared';
import { z } from 'zod';

// The jsonb columns the sender and the registry read (message_templates.params / buttons,
// messages.template_params), parsed instead of cast: a malformed row reads as empty, never crashes.

const buttonSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('url'), url: z.string(), text: z.string().optional() }),
  z.object({ type: z.literal('quick_reply'), text: z.string(), intent: z.enum(QUICK_REPLY_INTENTS) }),
]);

const paramsSchema = z.object({
  '1': z.string().optional(),
  '2': z.string().optional(),
  '3': z.string().optional(),
  button: z.string().optional(),
  payloads: z.array(z.string()).optional(),
  document: z.object({ bucket: z.string(), path: z.string(), filename: z.string() }).optional(),
});

export function templateButtons(json: Json | null): TemplateButton[] {
  const r = z.array(buttonSchema).safeParse(json);
  return r.success ? r.data : [];
}

/** message_templates.params: names of {{1}}, {{2}}, … in order. */
export function paramNames(json: Json | null): string[] {
  const r = z.array(z.string()).safeParse(json);
  return r.success ? r.data : [];
}

export function templateParams(json: Json | null): TemplateParams {
  const r = paramsSchema.safeParse(json);
  return r.success ? r.data : {};
}
