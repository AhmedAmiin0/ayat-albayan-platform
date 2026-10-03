import { describe, expect, it } from 'vitest';
import { feedbackQuerySchema, feedbackRequestSchema, feedbackSubmitSchema } from './feedback.js';

const ok = { rating: 5, recommend: 'yes' };

describe('feedbackSubmitSchema («رأيك يهمّنا», docs/13-forms-spec.md form 3)', () => {
  it('rating and recommend are required; note and phone are optional', () => {
    expect(feedbackSubmitSchema.parse(ok)).toEqual({ rating: 5, recommend: 'yes' });
    expect(feedbackSubmitSchema.safeParse({ rating: 5 }).success).toBe(false);
    expect(feedbackSubmitSchema.safeParse({ recommend: 'yes' }).success).toBe(false);
  });

  it.each([0, 6, 3.5, '4', null])('rating %s is refused (an integer 1-5)', (rating) => {
    expect(feedbackSubmitSchema.safeParse({ ...ok, rating }).success).toBe(false);
  });

  it('recommend is one of نعم / ربما / لا', () => {
    for (const recommend of ['yes', 'maybe', 'no']) expect(feedbackSubmitSchema.safeParse({ ...ok, recommend }).success).toBe(true);
    expect(feedbackSubmitSchema.safeParse({ ...ok, recommend: 'sure' }).success).toBe(false);
  });

  it('the note is trimmed, capped at 2000, and blank means absent', () => {
    expect(feedbackSubmitSchema.parse({ ...ok, note: '  جزاكم الله خيرًا  ' }).note).toBe('جزاكم الله خيرًا');
    expect(feedbackSubmitSchema.parse({ ...ok, note: '   ' }).note).toBeUndefined();
    expect(feedbackSubmitSchema.safeParse({ ...ok, note: 'x'.repeat(2001) }).success).toBe(false);
    expect(feedbackSubmitSchema.safeParse({ ...ok, note: 'x'.repeat(2000) }).success).toBe(true);
  });

  it('the contact phone becomes E.164 in any typed format; junk is refused; blank is absent', () => {
    expect(feedbackSubmitSchema.parse({ ...ok, contactPhone: '0501234567' }).contactPhone).toBe('+966501234567');
    expect(feedbackSubmitSchema.parse({ ...ok, contactPhone: '+20 100 000 0000' }).contactPhone).toBe('+201000000000');
    expect(feedbackSubmitSchema.parse({ ...ok, contactPhone: '' }).contactPhone).toBeUndefined();
    expect(feedbackSubmitSchema.safeParse({ ...ok, contactPhone: 'abc' }).success).toBe(false);
  });

  it('teacher, kind and ids are not part of the schema: whatever the client sends is dropped', () => {
    const parsed = feedbackSubmitSchema.parse({ ...ok, kind: 'trial', teacherId: 'x', teacher_id: 'x', lessonId: 'y' });
    expect(Object.keys(parsed).sort()).toEqual(['rating', 'recommend']);
  });
});

describe('feedbackRequestSchema and feedbackQuerySchema', () => {
  it('the request needs a student uuid; resend is optional', () => {
    const studentId = '00000000-0000-4000-8000-0000000000c1';
    expect(feedbackRequestSchema.parse({ studentId })).toEqual({ studentId });
    expect(feedbackRequestSchema.parse({ studentId, resend: true }).resend).toBe(true);
    expect(feedbackRequestSchema.safeParse({ studentId: 'nope' }).success).toBe(false);
  });

  it('the list filters coerce a query string', () => {
    expect(feedbackQuerySchema.parse({ rating: '4', kind: 'trial', from: '2026-10-01' })).toEqual({
      rating: 4,
      kind: 'trial',
      from: '2026-10-01',
    });
    expect(feedbackQuerySchema.safeParse({ rating: '7' }).success).toBe(false);
    expect(feedbackQuerySchema.safeParse({ from: 'yesterday' }).success).toBe(false);
  });
});
