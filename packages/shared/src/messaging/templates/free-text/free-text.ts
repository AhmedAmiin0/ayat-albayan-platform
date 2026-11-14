import { renderTemplateBody } from '../render.js';
import { TEMPLATE_LIMITS } from '../template-create.js';
import { BODY_SLOTS, type BodySlot, type TemplateParams } from '../templates.js';

// «أرسِل الآن داخل قالب» (owner 2026-11-14: «a template that carries your text»): after the 24 h
// window, staff send their typed text inside an approved template whose {{1}} is free text.
// Meta refuses a body parameter with a newline, a tab or more than 4 spaces in a row (132018), and
// a body over TEMPLATE_LIMITS.body characters: web, mobile and the API share these rules.

/** The chat line's «رسالة من أكاديمية آيات البيان» template: {{1}} is the staff's own text. */
export const MESSAGE_TEMPLATE = 'academy_message';

/** Templates whose body variable is free text (a multi-line box «نص الرسالة»), and which slot. */
export const FREE_TEXT_TEMPLATES: Readonly<Record<string, BodySlot>> = { [MESSAGE_TEMPLATE]: '1' };

/** The free-text slot of this template, or null when its variables are short values. */
export const freeTextSlot = (key: string): BodySlot | null => FREE_TEXT_TEMPLATES[key] ?? null;

/** Line breaks become « · » (one per run), tabs a space, runs of spaces one; trimmed. */
export function normaliseTemplateParam(text: string): string {
  return text
    .trim()
    .replace(/\s*[\r\n\v\f\u2028\u2029]+\s*/g, ' · ')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** Every body slot normalised; the button and payloads untouched. */
export function normaliseTemplateParams<T extends TemplateParams>(params: T): T {
  const out: T = { ...params };
  for (const slot of BODY_SLOTS) {
    const value = params[slot];
    if (value !== undefined) out[slot] = normaliseTemplateParam(value);
  }
  return out;
}

/** What Meta refuses in a body parameter (132018). */
const UNSAFE_PARAM = /[\r\n\t\v\f\u2028\u2029]| {5,}/;

/** Is this value one Meta takes as a body parameter? */
export const isMetaSafeParam = (value: string): boolean => !UNSAFE_PARAM.test(value);

/** The body's length once filled: what Meta caps at TEMPLATE_LIMITS.body. */
export const filledBodyLength = (body: string, params: TemplateParams): number =>
  renderTemplateBody(body, params).length;

/** How many characters `slot` may hold so the filled body stays within TEMPLATE_LIMITS.body. */
export function freeTextRoom(body: string, slot: BodySlot): number {
  const rest = renderTemplateBody(body, { [slot]: '' }).length;
  return Math.max(0, TEMPLATE_LIMITS.body - rest);
}

/** `text` cut to `room` UTF-16 units, never through an emoji's surrogate pair. */
export function capText(text: string, room: number): string {
  let out = '';
  for (const ch of text) {
    if (out.length + ch.length > room) break;
    out += ch;
  }
  return out;
}

/** The free text as it is sent: normalised, then cut so the whole body fits. */
export function sendableFreeText(body: string, slot: BodySlot, text: string): string {
  return capText(normaliseTemplateParam(text), freeTextRoom(body, slot));
}

/** Why the API refuses these params for this body (400), or null when Meta takes them. */
export type TemplateParamProblem = 'param_not_normalised' | 'body_too_long';

export function templateParamProblem(body: string, params: TemplateParams): TemplateParamProblem | null {
  const values = BODY_SLOTS.map((s) => params[s]).filter((v): v is string => v !== undefined);
  if (!values.every(isMetaSafeParam)) return 'param_not_normalised';
  return filledBodyLength(body, params) > TEMPLATE_LIMITS.body ? 'body_too_long' : null;
}
