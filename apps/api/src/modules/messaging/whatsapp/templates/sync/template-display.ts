import type { Json } from '@ab/db';
import {
  templateButtonKindSchema,
  templateHeaderKindSchema,
  type TemplateDisplay,
  type TemplateDisplayButton,
  type TemplateHeader,
} from '@ab/shared';
import { z } from 'zod';
import { own } from '@/common/infra/own-value';
import type { Component } from './template-sync';

// message_templates.display from Meta's components: what the guardian SEES, so the
// chat draws the template like WhatsApp. Every button is kept, the ones the sender cannot model
// too.

/** Meta's button types → ours; an authentication template's OTP button shows as «copy code». */
const BUTTONS = z.record(z.string(), templateButtonKindSchema).readonly().decode({
  QUICK_REPLY: 'quick_reply',
  URL: 'url',
  PHONE_NUMBER: 'phone_number',
  COPY_CODE: 'copy_code',
  OTP: 'copy_code',
});

type MetaButton = NonNullable<Component['buttons']>[number];

/** Meta's header format as ours; a header with no format is a text one. */
const headerKind = (part: Component): TemplateHeader['type'] | undefined =>
  templateHeaderKindSchema.safeParse((part.format ?? 'TEXT').toLowerCase()).data;

function header(comps: readonly Component[]): TemplateHeader | null {
  const part = comps.find((c) => c.type === 'HEADER');
  const kind = part ? headerKind(part) : undefined;
  if (!part || !kind) return null;
  if (kind !== 'text') return { type: kind };
  return part.text ? { type: 'text', text: part.text } : null;
}

/** One button as shown; a type WhatsApp draws differently (a flow, a catalog) is left out. */
function button(b: MetaButton): TemplateDisplayButton[] {
  const type = own(BUTTONS, b.type.toUpperCase());
  if (!type) return [];
  return [{ type, text: b.text ?? '', ...target(type, b) }];
}

/** The link of a url button, the number of a phone one, when Meta sent it. */
function target(
  type: TemplateDisplayButton['type'],
  b: MetaButton,
): Pick<TemplateDisplayButton, 'url' | 'phone'> {
  if (type === 'url') return b.url ? { url: b.url } : {};
  return type === 'phone_number' && b.phone_number ? { phone: b.phone_number } : {};
}

/** The header and buttons as Meta reports them, as message_templates.display (a jsonb value). */
export function metaDisplay(comps: readonly Component[]): Json {
  const raw = comps.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
  const display: TemplateDisplay = { header: header(comps), buttons: raw.flatMap(button) };
  // Plain JSON (strings, nulls, arrays); TS cannot see an interface as Json.
  return display as unknown as Json;
}
