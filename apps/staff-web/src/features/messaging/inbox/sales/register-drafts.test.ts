import { afterEach, describe, expect, it } from 'vitest';
import { draftFromLead } from '@/features/teaching/booking/booking-entries';
import { registerDrafts, resumable, type RegisterDraft } from './register-drafts';

const NOW = new Date('2026-10-19T10:00:00.000Z');
const draft = draftFromLead({ leadId: 'lead-1', phone: '+966501234567' }, null);
const saved = (startsAt: string | null, step: RegisterDraft['step'] = 'review'): RegisterDraft => ({
  draft: { ...draft, startsAt, extra: startsAt ? ['2026-10-22T10:00:00.000Z'] : [] },
  step,
});

afterEach(registerDrafts.clearAll);

describe('resumable (review M3)', () => {
  it('a future first lesson resumes as saved', () => {
    const s = saved('2026-10-20T10:00:00.000Z');
    expect(resumable(s, 'lead-1', NOW)).toBe(s);
  });

  it('another lead than the chat’s now: nothing to resume', () => {
    expect(resumable(saved('2026-10-20T10:00:00.000Z'), 'lead-2', NOW)).toBeUndefined();
    expect(resumable(undefined, 'lead-1', NOW)).toBeUndefined();
  });

  it('a first lesson already past: no slot, no extra picks, back on the slot step', () => {
    const back = resumable(saved('2026-10-19T09:00:00.000Z'), 'lead-1', NOW);
    expect(back?.draft.startsAt).toBeNull();
    expect(back?.draft.extra).toEqual([]);
    expect(back?.step).toBe('slot');
    expect(back?.draft.leadId).toBe('lead-1');
    expect(back?.droppedPast).toBe(true);
  });

  it('a future or empty slot reports nothing dropped (round 2 F)', () => {
    expect(resumable(saved('2026-10-20T10:00:00.000Z'), 'lead-1', NOW)?.droppedPast).toBeUndefined();
    expect(resumable(saved(null, 'teacher'), 'lead-1', NOW)?.droppedPast).toBeUndefined();
  });

  it('right now counts as past; an earlier step than the slot stays where it was', () => {
    expect(resumable(saved(NOW.toISOString()), 'lead-1', NOW)?.draft.startsAt).toBeNull();
    expect(resumable(saved('2026-10-19T09:00:00.000Z', 'teacher'), 'lead-1', NOW)?.step).toBe('teacher');
  });

  it('clearAll forgets every phone', () => {
    registerDrafts.set('+966501234567', saved(null));
    registerDrafts.set('+966507654321', saved(null));
    registerDrafts.clearAll();
    expect(registerDrafts.get('+966501234567')).toBeUndefined();
    expect(registerDrafts.get('+966507654321')).toBeUndefined();
  });
});
