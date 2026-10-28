import type { TemplateButton, TemplateParams } from './templates.js';

// A template as WhatsApp draws it (owner 2026-10-28: «not able to see the template like whatsapp if it
// have buttons»): the header over the body, the grey footer, and the buttons under the bubble. Display
// only: the sender keeps reading message_templates.buttons.

export const TEMPLATE_HEADER_KINDS = ['text', 'image', 'video', 'document', 'location'] as const;
export type TemplateHeaderKind = (typeof TEMPLATE_HEADER_KINDS)[number];
export const TEMPLATE_BUTTON_KINDS = ['quick_reply', 'url', 'phone_number', 'copy_code'] as const;
export type TemplateButtonKind = (typeof TEMPLATE_BUTTON_KINDS)[number];

export interface TemplateHeader {
  type: TemplateHeaderKind;
  /** A text header's words; absent for a media header (the bubble shows the message's file). */
  text?: string;
}

/** One button as WhatsApp shows it; `text` '' = Meta gave no label (the client names it by type). */
export interface TemplateDisplayButton {
  type: TemplateButtonKind;
  text: string;
  /** A URL button's link, its {{1}} filled; absent when the suffix is a guardian's own token. */
  url?: string;
  /** A call button's E.164 number. */
  phone?: string;
}

/** message_templates.display: the header and every button as Meta's sync last reported them; null = never synced. */
export interface TemplateDisplay {
  header: TemplateHeader | null;
  buttons: TemplateDisplayButton[];
}

/** MessageView.template / the composer's preview: what WhatsApp draws around the body. */
export interface MessageTemplateBlock {
  header: TemplateHeader | null;
  footer: string | null;
  buttons: TemplateDisplayButton[];
}

/** The message_templates columns the block reads (TemplateView carries them all). */
export interface TemplateBlockSource {
  key: string;
  header_format: string | null;
  footer_ar: string | null;
  buttons: readonly TemplateButton[];
  display?: TemplateDisplay | null;
}

/**
 * URL suffixes that are a guardian's own signed token (the feedback form, the classroom guest link):
 * a staff tap would act as the family, so the button shows its label only.
 */
const TOKEN_URL_KEYS: ReadonlySet<string> = new Set(['lesson_feedback_request', 'lesson_join_link']);

/** Before the first sync with `display`: the registry's own buttons (the sender's view). */
function registryButtons(buttons: readonly TemplateButton[]): TemplateDisplayButton[] {
  return buttons.map((b) => (b.type === 'url' ? { type: 'url', text: b.text ?? '', url: b.url } : { type: 'quick_reply', text: b.text }));
}

/** A URL button's link with {{1}} filled; none while its value is missing or a token. */
function filledUrl(url: string, key: string, params: TemplateParams): string | undefined {
  if (!url.includes('{{1}}')) return url;
  if (TOKEN_URL_KEYS.has(key) || !params.button) return undefined;
  return url.replace('{{1}}', encodeURIComponent(params.button));
}

function filled(b: TemplateDisplayButton, key: string, params: TemplateParams): TemplateDisplayButton {
  if (b.type !== 'url' || b.url === undefined) return b;
  const { url, ...rest } = b;
  const link = filledUrl(url, key, params);
  return link === undefined ? rest : { ...rest, url: link };
}

/**
 * The header, footer and buttons of a template message, its URL variable filled from the params.
 * A registry row Meta's sync has not described yet reads from its own columns: a document header
 * (report_ready), the footer, the URL and quick-reply buttons.
 */
export function templateBlock(src: TemplateBlockSource, params: TemplateParams): MessageTemplateBlock {
  const header = src.display ? src.display.header : src.header_format === 'document' ? { type: 'document' as const } : null;
  const buttons = src.display ? src.display.buttons : registryButtons(src.buttons);
  return { header, footer: src.footer_ar, buttons: buttons.map((b) => filled(b, src.key, params)) };
}

/** The link a staff tap may open: a URL button's http(s) link only; every other button is display-only. */
export function templateButtonLink(b: TemplateDisplayButton): string | null {
  return b.type === 'url' && b.url && /^https?:\/\//i.test(b.url) ? b.url : null;
}
