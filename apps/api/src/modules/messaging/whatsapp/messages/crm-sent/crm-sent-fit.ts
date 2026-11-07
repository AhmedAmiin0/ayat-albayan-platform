import type { WabaTemplate } from '@/modules/messaging/whatsapp/drivers/waba/waba-template';
import type { Component } from '@/modules/messaging/whatsapp/templates/sync/template-sync';

// Guard against a copy that no longer matches the row (a crm_name change since the send: the
// name and values are re-derived from today's registry row). Pure.

const TEXT_PARTS: ReadonlySet<string> = new Set(['HEADER', 'BODY']);

/** The highest {{n}} in the copy's header and body; 0 = none. */
function highestSlot(copy: readonly Component[]): number {
  const texts = copy.filter((c) => TEXT_PARTS.has(c.type)).map((c) => c.text ?? '');
  const slots = texts.flatMap((t) => [...t.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])));
  return Math.max(0, ...slots);
}

/** Meta's indexes of the copy's URL buttons whose link takes a {{1}}. */
function linkSlots(copy: readonly Component[]): number[] {
  const buttons = copy.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
  const takesValue = (b: (typeof buttons)[number]) =>
    b.type.toUpperCase() === 'URL' && (b.url ?? '').includes('{{1}}');
  return buttons.flatMap((b, i) => (takesValue(b) ? [i] : []));
}

/** Every {{n}} of the copy has a sent value: else the inbox keeps the registry's rendering. */
export function copyFits(copy: readonly Component[], sent: WabaTemplate): boolean {
  const sentAt = new Set(sent.buttons.map((b) => b.index));
  const linksFilled = linkSlots(copy).every((i) => sentAt.has(i));
  return highestSlot(copy) <= sent.body.length && linksFilled;
}
