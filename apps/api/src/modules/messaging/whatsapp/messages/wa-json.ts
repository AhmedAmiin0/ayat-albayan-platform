import type { Json } from '@ab/db';
import {
  BODY_SLOTS,
  crmValuesSchema,
  templateButtonSchema,
  templateDisplaySchema,
  type BodySlot,
  type TemplateButton,
  type TemplateDisplay,
  type TemplateParams,
} from '@ab/shared';
import { z } from 'zod';

// The jsonb columns the sender and the registry read (message_templates.params / buttons,
// messages.template_params), parsed instead of cast: a malformed row reads as empty, never crashes.


const slot = z.string().optional();
const slots = Object.fromEntries(BODY_SLOTS.map((s) => [s, slot])) as Record<BodySlot, typeof slot>;

const paramsSchema = z.object({
  ...slots,
  button: z.string().optional(),
  buttons: z.array(z.string()).optional(),
  payloads: z.array(z.string()).optional(),
  document: z.object({ bucket: z.string(), path: z.string(), filename: z.string() }).optional(),
  // A malformed crm part is dropped, never the whole row's values (the meta and kapso drivers never read it).
  crm: crmValuesSchema.optional().catch(undefined),
});

export function templateButtons(json: Json | null): TemplateButton[] {
  const r = z.array(templateButtonSchema).safeParse(json);
  return r.success ? r.data : [];
}

/** message_templates.display (what WhatsApp shows); null when never synced or malformed (the columns' fallback). */
export function templateDisplay(json: Json | null): TemplateDisplay | null {
  const r = templateDisplaySchema.safeParse(json);
  return r.success ? r.data : null;
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
