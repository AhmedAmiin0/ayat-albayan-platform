import { describe, expect, it } from 'vitest';
import { courseDraftSavedSchema } from './course-draft.js';

const BOOKING = { rule_id: 'r1', student_ids: ['s1'], guardian_ids: ['g1'], lessons: [], message_ids: [], invoice_id: null };

describe('courseDraftSavedSchema (owner 2026-11-06)', () => {
  it('a draft kept, or the booking made at once', () => {
    expect(courseDraftSavedSchema.parse({ state: 'draft', saved_at: 'x' })).toEqual({ state: 'draft', saved_at: 'x' });
    expect(courseDraftSavedSchema.parse({ state: 'booked', booking: BOOKING }).state).toBe('booked');
  });

  it('anything else is refused', () => {
    expect(courseDraftSavedSchema.safeParse({ state: 'booked' }).success).toBe(false);
    expect(courseDraftSavedSchema.safeParse({ state: 'x' }).success).toBe(false);
  });
});
