import type { Enums } from '@ab/db';
import { normalizeArabic } from '../../format/arabic.js';
import { intlLocale } from '../../i18n/locale.js';
import { joinNames } from './booking-confirmation.js';
import { quickReplyPayload, type QuickReplyIntent } from '../replies/quick-reply.js';
import type { OutboundTemplate } from '../templates/templates.js';

// «تقييم الحلقة» by WhatsApp buttons (migration 195): the lesson_rating template's three quick
// replies. A tap is an inbound message, so it reopens the 24 h window (docs/12 §3.5).

export const LESSON_RATINGS = ['excellent', 'good', 'needs_work'] as const satisfies readonly Enums<'feedback_quick_rating'>[];
export type LessonRating = (typeof LESSON_RATINGS)[number];

export const RATING_TEMPLATE = 'lesson_rating';

const INTENT: Record<LessonRating, QuickReplyIntent> = {
  excellent: 'rate_excellent',
  good: 'rate_good',
  needs_work: 'rate_needs_work',
};

/** The buttons' texts as seeded (migration 195), in LESSON_RATINGS order. */
export const RATING_BUTTON_TEXTS: Readonly<Record<LessonRating, string>> = {
  excellent: 'ممتازة',
  good: 'جيدة',
  needs_work: 'تحتاج تحسينًا',
};

/** excellent / good / needs_work from a rate_* intent; null for confirm, stop, … */
export function ratingOfIntent(intent: QuickReplyIntent | null): LessonRating | null {
  return LESSON_RATINGS.find((r) => INTENT[r] === intent) ?? null;
}

/** A button's text (Meta always sends it) → the rating; only an exact button text counts. */
export function ratingOfText(text: string | null | undefined): LessonRating | null {
  if (!text) return null;
  const typed = normalizeArabic(text).replace(/[^\p{L}\p{N} ]/gu, '').trim();
  return LESSON_RATINGS.find((r) => normalizeArabic(RATING_BUTTON_TEXTS[r]).replace(/[^\p{L}\p{N} ]/gu, '') === typed) ?? null;
}

/** The rating of a stored inbound row's interactive_payload ({ type: 'button', button: { payload, text } }). */
export function ratingOfInteractive(payload: unknown): LessonRating | null {
  if (payload === null || typeof payload !== 'object') return null;
  const button = (payload as { button?: unknown }).button;
  if (button === null || typeof button !== 'object') return null;
  const { payload: key, text } = button as { payload?: unknown; text?: unknown };
  const head = typeof key === 'string' ? key.split(':', 1)[0] : null;
  const fromKey = LESSON_RATINGS.find((r) => INTENT[r] === head) ?? null;
  return fromKey ?? (typeof text === 'string' ? ratingOfText(text) : null);
}

const dateFormats = new Map<string, Intl.DateTimeFormat>();

/** {{2}}: «الأحد 4 أكتوبر», the lesson's day in the guardian's tz (Western digits). */
export function lessonDateText(startsAt: Date, tz: string): string {
  let f = dateFormats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale('ar'), { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz });
    dateFormats.set(tz, f);
  }
  const parts = f.formatToParts(startsAt);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return [part('weekday'), part('day'), part('month')].join(' ');
}

export interface RatingMessageInput {
  lessonId: string;
  /** This guardian's children on the lesson. */
  studentNames: readonly string[];
  startsAt: Date;
  /** The guardian's tz. */
  tz: string;
}

/** lesson_rating for one guardian: names, the day, and one «rate_<value>:<lesson>» payload per button. */
export function lessonRatingMessage(input: RatingMessageInput): OutboundTemplate {
  return {
    key: RATING_TEMPLATE,
    params: {
      '1': joinNames(input.studentNames),
      '2': lessonDateText(input.startsAt, input.tz),
      payloads: LESSON_RATINGS.map((r) => quickReplyPayload(INTENT[r], input.lessonId)),
    },
  };
}
