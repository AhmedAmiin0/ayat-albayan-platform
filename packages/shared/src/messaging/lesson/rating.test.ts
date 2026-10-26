import { describe, expect, it } from 'vitest';
import ar from '../../../i18n/ar.json' with { type: 'json' };
import { payloadRef, quickReplyIntent } from '../replies/quick-reply.js';
import {
  LESSON_RATINGS,
  lessonDateText,
  lessonRatingMessage,
  RATING_BUTTON_TEXTS,
  ratingOfInteractive,
  ratingOfIntent,
  ratingOfText,
} from './rating.js';

const LESSON = '7f0c2c4e-1b2a-4c3d-9e8f-0a1b2c3d4e5f';

describe('lessonRatingMessage (migration 195)', () => {
  const msg = lessonRatingMessage({
    lessonId: LESSON,
    studentNames: ['سهيلة', 'مريم'],
    startsAt: new Date('2026-10-04T14:00:00Z'),
    tz: 'Asia/Riyadh',
  });

  it('fills the names and the day in the guardian tz', () => {
    expect(msg.key).toBe('lesson_rating');
    expect(msg.params['1']).toBe('سهيلة ومريم');
    expect(msg.params['2']).toBe('الأحد 4 أكتوبر');
  });

  it('one payload per button, in button order, each carrying the lesson', () => {
    expect(msg.params.payloads).toEqual([`rate_excellent:${LESSON}`, `rate_good:${LESSON}`, `rate_needs_work:${LESSON}`]);
    for (const [i, p] of (msg.params.payloads ?? []).entries()) {
      expect(payloadRef(p)).toBe(LESSON);
      expect(ratingOfIntent(quickReplyIntent(p))).toBe(LESSON_RATINGS[i]);
    }
  });

  it('the day follows the guardian tz across midnight', () => {
    const late = new Date('2026-10-04T22:30:00Z');
    expect(lessonDateText(late, 'Asia/Riyadh')).toBe('الاثنين 5 أكتوبر');
    expect(lessonDateText(late, 'Africa/Cairo')).toBe('الاثنين 5 أكتوبر');
    expect(lessonDateText(late, 'America/New_York')).toBe('الأحد 4 أكتوبر');
  });
});

describe('ratingOfText / ratingOfIntent', () => {
  it.each([
    ['ممتازة', 'excellent'],
    ['ممتازه', 'excellent'],
    [' جيدة ', 'good'],
    ['تحتاج تحسينًا', 'needs_work'],
    ['تحتاج تحسينا', 'needs_work'],
  ] as const)('«%s» → %s', (text, rating) => {
    expect(ratingOfText(text)).toBe(rating);
  });

  it.each(['جيدة جدا', 'تمام', 'ممتازة لكن المعلمة تأخرت', '', null])('«%s» is not a button text', (text) => {
    expect(ratingOfText(text)).toBeNull();
  });

  it('confirm / stop / null are no rating; typed button texts never become a quick-reply intent', () => {
    expect(ratingOfIntent('confirm')).toBeNull();
    expect(ratingOfIntent(null)).toBeNull();
    for (const text of Object.values(RATING_BUTTON_TEXTS)) expect(quickReplyIntent(text)).toBeNull();
  });

  it('buttons stay within Meta’s 20 characters and match the Arabic labels', () => {
    for (const r of LESSON_RATINGS) {
      expect(RATING_BUTTON_TEXTS[r].length).toBeLessThanOrEqual(20);
      expect(ar.feedback.quickRating[r]).toBe(RATING_BUTTON_TEXTS[r]);
    }
  });
});

describe('ratingOfInteractive (the inbox chip)', () => {
  it('reads our payload first, else the button text', () => {
    expect(ratingOfInteractive({ type: 'button', button: { payload: `rate_good:${LESSON}`, text: 'ممتازة' } })).toBe('good');
    expect(ratingOfInteractive({ type: 'button', button: { payload: 'whatever', text: 'تحتاج تحسينًا' } })).toBe('needs_work');
  });

  it.each([null, 'x', {}, { button: null }, { button: { payload: `confirm:${LESSON}`, text: 'تمام' } }])('%j → null', (p) => {
    expect(ratingOfInteractive(p)).toBeNull();
  });
});
