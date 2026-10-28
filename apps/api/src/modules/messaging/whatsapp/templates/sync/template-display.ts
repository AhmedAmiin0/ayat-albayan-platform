import type { Json } from '@ab/db';
import type { TemplateButtonKind, TemplateDisplay, TemplateDisplayButton, TemplateHeader, TemplateHeaderKind } from '@ab/shared';
import type { Component } from './template-sync';

// message_templates.display from Meta's components (owner 2026-10-28): what the guardian SEES, so the
// chat draws the template like WhatsApp. Every button is kept, the ones the sender cannot model too.

const HEADERS: Record<string, TemplateHeaderKind> = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  LOCATION: 'location',
};

/** Meta's button types → ours; an authentication template's OTP button shows as «copy code». */
const BUTTONS: Record<string, TemplateButtonKind> = {
  QUICK_REPLY: 'quick_reply',
  URL: 'url',
  PHONE_NUMBER: 'phone_number',
  COPY_CODE: 'copy_code',
  OTP: 'copy_code',
};

type MetaButton = NonNullable<Component['buttons']>[number];

function header(comps: readonly Component[]): TemplateHeader | null {
  const part = comps.find((c) => c.type === 'HEADER');
  const kind = HEADERS[part?.format?.toUpperCase() ?? 'TEXT'];
  if (!part || !kind) return null;
  if (kind !== 'text') return { type: kind };
  return part.text ? { type: 'text', text: part.text } : null;
}

/** One button as shown; a type WhatsApp draws differently (a flow, a catalog) is left out. */
function button(b: MetaButton): TemplateDisplayButton[] {
  const type = BUTTONS[b.type.toUpperCase()];
  if (!type) return [];
  const text = b.text ?? '';
  if (type === 'url') return [{ type, text, ...(b.url ? { url: b.url } : {}) }];
  if (type === 'phone_number') return [{ type, text, ...(b.phone_number ? { phone: b.phone_number } : {}) }];
  return [{ type, text }];
}

/** The header and buttons as Meta reports them, as message_templates.display (a jsonb value). */
export function metaDisplay(comps: readonly Component[]): Json {
  const raw = comps.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
  const display: TemplateDisplay = { header: header(comps), buttons: raw.flatMap(button) };
  // Plain JSON (strings, nulls, arrays); TS cannot see an interface as Json.
  return display as unknown as Json;
}
