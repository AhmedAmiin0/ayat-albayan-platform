import { z } from 'zod';
import { callPermissionMessage, waTo, type GraphBody } from '@/modules/messaging/whatsapp';
import type { PermissionRequest } from './calls-api';

// Interactive request inside the 24 h window, else the configured template (docs/28 §10).

const TEMPLATE_RE = /^([a-z0-9_]{1,512})(?::([a-z]{2,3}(?:_[A-Z]{2})?))?$/;

/** The setting's value as a template name and language; null = unset or not a template name. */
export function permissionTemplate(
  value: string | null | undefined,
): { name: string; language: string } | null {
  const m = TEMPLATE_RE.exec((value ?? '').trim());
  return m?.[1] ? { name: m[1], language: m[2] ?? 'ar' } : null;
}

const textRequestSchema = z.object({ to: z.string(), text: z.string() });
const templateRequestSchema = z.object({
  to: z.string(),
  template: z.object({ name: z.string(), language: z.string() }),
});

export function permissionRequestBody(input: PermissionRequest): GraphBody {
  const text = textRequestSchema.safeParse(input);
  if (text.success) return callPermissionMessage(text.data);
  const { to, template } = templateRequestSchema.parse(input);
  const { name, language } = template;
  return {
    ...{ messaging_product: 'whatsapp', recipient_type: 'individual', to: waTo(to) },
    ...{ type: 'template', template: { name, language: { code: language } } },
  };
}
