import type { TemplateButton } from '@ab/shared';
import { TEMPLATE_CATEGORIES, type TemplateCategory } from '@ab/catalog';
import {
  metaButtons,
  type Component,
} from '@/modules/messaging/whatsapp/templates/sync/template-sync';

// What a WABA template must be for the import (template-import.ts): checks on Meta's own parts.

const isCategory = (c: string): c is TemplateCategory =>
  (TEMPLATE_CATEGORIES as readonly string[]).includes(c);

/** An authentication template (account_code, docs/30) is never a starter: only our seeded row. */
export const isStarterCategory = (c: string): c is TemplateCategory =>
  isCategory(c) && c !== 'authentication';

/**
 * The highest numbered {{n}}; null when a variable is named ({{first_name}}): we send by position.
 */
export function varCount(body: string): number | null {
  const vars = [...body.matchAll(/\{\{([^}]*)\}\}/g)].map((m) => (m[1] ?? '').trim());
  if (vars.some((v) => !/^\d+$/.test(v))) return null;
  return Math.max(0, ...vars.map(Number));
}

/**
 * No header, or a plain text one: a media header or a header variable needs a part we never send.
 */
export function headerOk(comps: readonly Component[]): boolean {
  const header = comps.find((c) => c.type === 'HEADER');
  return !header || (header.format?.toUpperCase() === 'TEXT' && !(header.text ?? '').includes('{{'));
}

type MetaButton = NonNullable<Component['buttons']>[number];

/** A button that needs no value at send time: a quick reply, a phone number, a fixed link. */
const valueFree = (b: MetaButton): boolean => {
  const type = b.type.toUpperCase();
  return type === 'QUICK_REPLY' || type === 'PHONE_NUMBER' || (type === 'URL' && !(b.url ?? '').includes('{{'));
};

/**
 * Meta's buttons as ours. A list we cannot model (a reply without a known intent, a phone button)
 * is kept as none when every button needs no value: the send then carries no button part, which
 * Meta accepts (a tap arrives as plain text). null = a button needs a value we cannot send (copy
 * code…).
 */
export function importButtons(comps: readonly Component[]): TemplateButton[] | null {
  const raw = comps.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
  return metaButtons(comps, []) ?? (raw.every(valueFree) ? [] : null);
}
