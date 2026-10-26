// Meta Graph API shapes the stub answers with (docs/12 §5): templates, errors, media metadata.
import { randomUUID } from 'node:crypto';

export type Json = Record<string, unknown>;

export interface StubTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  /** APPROVED | PENDING | REJECTED | PAUSED | DISABLED … as Meta spells them. */
  status: string;
  /** GREEN | YELLOW | RED | UNKNOWN */
  quality: string;
  components: Json[];
  /** Only on this WABA (the chat line's starters, a template created on a configured line); absent = on every WABA. */
  wabaId?: string;
  /** Meta's rejected_reason (INVALID_FORMAT, …), set by POST /__stub/templates/{name}; absent = NONE. */
  rejectedReason?: string;
}

/** The templates one WABA has: its own, plus those on every WABA (single line: all of them). */
export const onWaba = (t: StubTemplate, wabaId: string | undefined): boolean => t.wabaId === undefined || t.wabaId === wabaId;

const FOOTER = { type: 'FOOTER', text: 'أكاديمية آيات البيان' };
const JITSI = 'https://meet.jit.si/{{1}}';
const MEET = 'https://meet.google.com/{{1}}';

function approved(name: string, body: string, url?: string): StubTemplate {
  const components: Json[] = [{ type: 'BODY', text: body }, FOOTER];
  if (url) components.push({ type: 'BUTTONS', buttons: [{ type: 'URL', text: 'ادخل الحلقة', url }] });
  return { id: randomUUID(), name, language: 'ar', category: 'UTILITY', status: 'APPROVED', quality: 'GREEN', components };
}

const BOOKED = 'تم حجز حلقة {{1}} — {{2}}';
const TODAY = 'حلقة {{1}} النهاردة — {{2}}';
const TEACHER = 'أستاذ {{1}}، عندك حلقة {{2}}';

/**
 * The 8 templates approved on the academy's WABA (migration 141). The registry's others start absent
 * (report_ready, renewal_due, follow_up_slots, lesson_reminder_24h, lesson_feedback_request,
 * lesson_join_link, lesson_rating with its 3 quick replies): the admin submits them (POST
 * /{waba}/message_templates) and POST /__stub/templates/{name} plays Meta's review.
 */
export function defaultTemplates(): StubTemplate[] {
  return [
    approved('booking_confirmation', BOOKED, JITSI),
    approved('booking_confirmation_meet', BOOKED, MEET),
    approved('booking_confirmation_plain', BOOKED),
    approved('lesson_reminder_v2', TODAY, JITSI),
    approved('lesson_reminder_meet', TODAY, MEET),
    approved('lesson_reminder_plain', TODAY),
    approved('teacher_lesson_reminder', TEACHER),
    approved('teacher_lesson_reminder_meet', TEACHER, MEET),
  ];
}

const WELCOME = 'أهلًا بك في أكاديمية آيات البيان يا {{1}}، يسعدنا تواصلك معنا. هل تودّ حجز حلقة تجريبية مجانية؟';
const TRIAL = 'السلام عليكم {{1}}، ندعوكم إلى حلقة تجريبية مجانية مع أكاديمية آيات البيان. هل يناسبكم موعد قريب؟';

/**
 * The chat line's approved templates (owner 2026-10-12): only on the chat WABA, so only the chat
 * number can send them. The API's health check imports all three, and flags only the restricted
 * defaults (free_trial_invite, welcome_greeting): academy_welcome arrives unflagged.
 */
export function defaultChatTemplates(wabaId: string): StubTemplate[] {
  return [
    { ...approved('academy_welcome', WELCOME), category: 'MARKETING', wabaId },
    { ...approved('free_trial_invite', TRIAL), category: 'MARKETING', wabaId },
    { ...approved('welcome_greeting', WELCOME), category: 'MARKETING', wabaId },
  ];
}

/** GET /{waba}/message_templates item. */
export function templateJson(t: StubTemplate): Json {
  return {
    id: t.id,
    name: t.name,
    language: t.language,
    category: t.category,
    status: t.status,
    quality_score: { score: t.quality },
    components: t.components,
    rejected_reason: t.rejectedReason ?? 'NONE',
  };
}

/** Number of distinct {{n}} in the BODY component. */
export function bodyParamCount(t: StubTemplate): number {
  const body = t.components.find((c) => c['type'] === 'BODY');
  const text = typeof body?.['text'] === 'string' ? body['text'] : '';
  return new Set(text.match(/\{\{\d+\}\}/g) ?? []).size;
}

export function metaError(code: number, message: string, details?: string): Json {
  return {
    error: {
      message: `(#${code}) ${message}`,
      type: 'OAuthException',
      code,
      ...(details ? { error_data: { messaging_product: 'whatsapp', details } } : {}),
      fbtrace_id: `stub-${randomUUID().slice(0, 8)}`,
    },
  };
}

export const ERR = {
  auth: () => metaError(190, 'Invalid OAuth access token'),
  noTemplate: (name: string, lang: string) =>
    metaError(132001, 'Template name does not exist in the translation', `template name (${name}) does not exist in ${lang}`),
  paused: (name: string) => metaError(132015, 'Template is paused', `template (${name}) is paused`),
  params: (want: number, got: number) =>
    metaError(132000, 'Number of parameters does not match the expected number of params', `body: expected ${want}, got ${got}`),
  window: () =>
    metaError(131047, 'Re-engagement message', 'More than 24 hours have passed since the recipient last replied'),
  duplicate: (name: string) => metaError(100, 'Invalid parameter', `template ${name} already exists in this language`),
  badName: (name: string) => metaError(100, 'Invalid parameter', `invalid template name ${name}`),
  noMedia: (id: string) => metaError(100, 'Invalid parameter', `media ${id} not found`),
  noObject: (id: string) => metaError(100, 'Unsupported post request', `Object with ID '${id}' does not exist`),
  /** Template components and resumable uploads: Meta's code 100 with what was wrong. */
  invalid: (details: string) => metaError(100, 'Invalid parameter', details),
};
