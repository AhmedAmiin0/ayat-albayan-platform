import { describe, expect, it } from 'vitest';
import { L1, lessonRow, S1 } from '@/modules/people/portal/portal.fakes';
import { familyOf, latestRequest } from './portal-lesson-family';
import type { PortalRequestRow } from './portal-lessons.repo';

// The fixture lesson starts 2026-10-27T16:00Z.
type Over = Partial<{ lateCancelHours: number | null; requests: PortalRequestRow[] }>;
const ctx = (now: string, over: Over = {}) => ({
  studentId: S1, now: new Date(now), lateCancelHours: 24, requests: [], ...over,
});
const req = (over: Partial<PortalRequestRow>): PortalRequestRow => ({
  id: 'r1', lesson_id: L1, status: 'pending', proposed_starts_at: '2026-10-28 15:30:00+00', note: 'اختبار',
  decision_note: null, decided_at: null, created_at: '2026-10-26T10:00:00Z', ...over,
});

describe('the family block of a portal lesson (owner 2026-11-17)', () => {
  it("«أعتذر» counts from the package only inside late_cancel_hours (the cancel's own rule)", () => {
    expect(familyOf(lessonRow(), ctx('2026-10-25T10:00:00Z')).counts).toBe(false);
    expect(familyOf(lessonRow(), ctx('2026-10-27T10:00:00Z')).counts).toBe(true);
    expect(familyOf(lessonRow(), ctx('2026-10-27T10:00:00Z', { lateCancelHours: null })).counts).toBe(false);
  });

  it("an excused lesson says its own outcome (the student's chargeable flag)", () => {
    const excused = (chargeable: boolean) => lessonRow({ status: 'excused', lesson_students: [{ student_id: S1, chargeable }] });
    expect(familyOf(excused(false), ctx('2026-10-27T15:00:00Z')).counts).toBe(false);
    expect(familyOf(excused(true), ctx('2026-10-25T15:00:00Z')).counts).toBe(true);
  });

  it('the newest family request of this lesson, waiting or declined; withdrawn / approved: none', () => {
    expect(latestRequest([req({})], L1)).toMatchObject({ status: 'pending', proposed_starts_at: '2026-10-28T15:30:00.000Z' });
    const older = req({ id: 'old', status: 'rejected', created_at: '2026-10-20T10:00:00Z' });
    expect(latestRequest([older, req({ status: 'withdrawn' })], L1)).toBeNull();
    const declined = req({ status: 'rejected', decision_note: 'لا يتوفر وقت', decided_at: '2026-10-26 12:00:00+00' });
    expect(latestRequest([declined], L1)).toMatchObject({ status: 'rejected', decision_note: 'لا يتوفر وقت', decided_at: '2026-10-26T12:00:00.000Z' });
    expect(latestRequest([req({ lesson_id: 'other' })], L1)).toBeNull();
    expect(latestRequest([req({ status: 'approved' })], L1)).toBeNull();
  });
});
