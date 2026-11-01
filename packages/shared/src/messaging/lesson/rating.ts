import { z } from 'zod';
import type { Enums } from '@ab/db';
import { normalizeArabic } from '@ab/core';
import { weekdayDayMonth } from '../../time/index.js';
import { joinNames } from './booking-confirmation.js';
import { quickReplyPayload, type QuickReplyIntent } from '../replies/quick-reply.js';
import type { OutboundTemplate } from '../templates/templates.js';
import { lenientString, parseOrNull } from '../payload/index.js';

// «تقييم الحلقة» by WhatsApp buttons (migration 195): the lesson_rating template's three quick
// replies. A tap is an inbound message, so it reopens the 24 h window (docs/12 §3.5).

export const LESSON_RATINGS = ['excellent', 'good', 'needs_work'] as const satisfies readonly Enums<
  'feedback_quick_rating'
>[];
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
  const plain = (r: LessonRating): string =>
    normalizeArabic(RATING_BUTTON_TEXTS[r]).replace(/[^\p{L}\p{N} ]/gu, '');
  return LESSON_RATINGS.find((r) => plain(r) === typed) ?? null;
}

/** A button's rate_* payload key («rate_good:<lesson>») → the rating. */
const ratingOfKey = (key: string | undefined): LessonRating | null =>
  LESSON_RATINGS.find((r) => INTENT[r] === key?.split(':', 1)[0]) ?? null;

/** A stored button's rating: its rate_* payload key first, else its exact text. */
const ratedButtonSchema = z
  .looseObject({
    button: z.looseObject({ payload: lenientString, text: lenientString }),
  })
  .transform(({ button }) => ratingOfKey(button.payload) ?? ratingOfText(button.text));

/**
 * The rating of a stored inbound row's interactive_payload ({ type: 'button', button: { payload,
 * text } }).
 */
export const ratingOfInteractive = (payload: unknown): LessonRating | null =>
  parseOrNull(ratedButtonSchema, payload);

/** {{2}}: «الأحد 4 أكتوبر», the lesson's day in the guardian's tz (Western digits). */
export function lessonDateText(startsAt: Date, tz: string): string {
  return weekdayDayMonth(startsAt, { tz, locale: 'ar' });
}

export interface RatingMessageInput {
  lessonId: string;
  /** This guardian's children on the lesson. */
  studentNames: readonly string[];
  startsAt: Date;
  /** The guardian's tz. */
  tz: string;
}

/**
 * lesson_rating for one guardian: names, the day, and one «rate_<value>:<lesson>» payload per
 * button.
 */
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
