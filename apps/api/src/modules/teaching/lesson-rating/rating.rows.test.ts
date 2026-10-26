import { describe, expect, it } from 'vitest';
import { GUARDIAN_ID, LESSON_ID, NOW } from './rating.fakes';
import { ratingInserts, ratingPatch, type RatingTap } from './rating.rows';

const tap: RatingTap = { lessonId: LESSON_ID, guardianId: GUARDIAN_ID, rating: 'needs_work', waMessageId: 'wamid.IN1', at: NOW };

describe('rating rows (migration 195)', () => {
  it('the patch is only the three button columns (the form answer is never touched)', () => {
    expect(ratingPatch(tap)).toEqual({ quick_rating: 'needs_work', quick_rated_at: NOW.toISOString(), quick_rating_wa_id: 'wamid.IN1' });
  });

  it('a new row per child: made by the button, no link, kind and teacher from the lesson', () => {
    const rows = ratingInserts(tap, { teacherId: 't1', kind: 'trial', studentIds: ['s1', 's2'] });
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({
      lesson_id: LESSON_ID,
      student_id: 's2',
      guardian_id: GUARDIAN_ID,
      teacher_id: 't1',
      kind: 'trial',
      token_hash: null,
      requested_at: NOW.toISOString(),
      expires_at: NOW.toISOString(),
      source: 'whatsapp_button',
      quick_rating: 'needs_work',
      quick_rated_at: NOW.toISOString(),
      quick_rating_wa_id: 'wamid.IN1',
    });
    expect(rows[0]).not.toHaveProperty('rating');
    expect(rows[0]).not.toHaveProperty('submitted_at');
  });
});
