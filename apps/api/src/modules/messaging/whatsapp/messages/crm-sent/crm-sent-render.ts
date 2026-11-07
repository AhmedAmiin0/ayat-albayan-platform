import { TOKEN_URL_KEYS, type MessageTemplateBlock, type TemplateDisplayButton } from '@ab/shared';
import type { WabaTemplate } from '@/modules/messaging/whatsapp/drivers/waba/waba-template';
import { templateDisplay } from '@/modules/messaging/whatsapp/messages/wa-json';
import { metaDisplay } from '@/modules/messaging/whatsapp/templates/sync/template-display';
import type { Component } from '@/modules/messaging/whatsapp/templates/sync/template-sync';

// A row sent through the CRM as its recipient got it: the CRM template's own header, body, footer
// and buttons, filled with the values the driver sent (crm-sent-template.ts). Pure.

export interface SentRender {
  body: string;
  block: MessageTemplateBlock;
  /** The wa.me fallback text: the body, the buttons' links, the file link, the footer. */
  text: string;
}

interface RenderInput {
  copy: readonly Component[];
  sent: WabaTemplate;
  /** The row's template_key: a family token link (TOKEN_URL_KEYS) shows its label only. */
  key: string;
  /** The report PDF's signed link, while the admin may still send it by hand. */
  documentUrl?: string | null;
}

const textOf = (copy: readonly Component[], type: string): string | null =>
  copy.find((c) => c.type === type)?.text ?? null;

/** {{n}} → the n-th sent value; a missing one keeps its {{n}} (renderTemplateBody's rule). */
const filledBody = (body: string, values: readonly string[]): string =>
  body.replace(/\{\{(\d+)\}\}/g, (whole, n: string) => values[Number(n) - 1] ?? whole);

/** The value a URL button's {{1}} takes: none while unsent, or a family token (a staff tap). */
const linkValue = (value: string | undefined, key: string): string | undefined =>
  (TOKEN_URL_KEYS.has(key) ? undefined : value);

/** A URL button's {{1}} from the value sent at its index; no link while none (linkValue). */
function filledButton(b: TemplateDisplayButton, value: string | undefined, key: string) {
  if (b.type !== 'url' || !b.url?.includes('{{1}}')) return b;
  const { url = '', ...rest } = b;
  const link = linkValue(value, key);
  return link === undefined ? rest : { ...rest, url: url.replace('{{1}}', link) };
}

/** The header, footer and buttons WhatsApp drew around the body. */
type Block = MessageTemplateBlock;
function blockOf(copy: readonly Component[], sent: WabaTemplate, key: string): Block {
  const display = templateDisplay(metaDisplay(copy));
  const valueAt = (i: number) => sent.buttons.find((b) => b.index === i)?.value;
  const buttons = (display?.buttons ?? []).map((b, i) => filledButton(b, valueAt(i), key));
  return { header: display?.header ?? null, footer: textOf(copy, 'FOOTER'), buttons };
}

/** fallbackText's order: the body, the buttons' links, the file link, the footer. */
function handOff(body: string, block: MessageTemplateBlock, documentUrl: string): string {
  const links = block.buttons.flatMap((b) => (b.type === 'url' && b.url ? [b.url] : []));
  return [body, ...links, documentUrl, block.footer ?? ''].filter(Boolean).join('\n\n');
}

export function renderSent(input: RenderInput): SentRender {
  const { copy, sent, key } = input;
  const body = filledBody(textOf(copy, 'BODY') ?? '', sent.body);
  const block = blockOf(copy, sent, key);
  return { body, block, text: handOff(body, block, input.documentUrl ?? '') };
}
