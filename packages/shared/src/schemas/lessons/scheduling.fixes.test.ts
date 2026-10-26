import { describe, expect, it } from 'vitest';
import { settingsUpdateSchema } from '../../settings/schema.js';
import {
  bookingRequestSchema,
  lessonProposalRequestSchema,
  lessonStatusRequestSchema,
  proposalApproveSchema,
} from './scheduling.js';

const S = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const RULE = {
  teacherId: S,
  byday: [0],
  startTimeLocal: '17:00',
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-10-04',
  package: '8',
  studentIds: [S],
};

describe('verifier-fix command fields (R-SCH-08, R-STU-04, rule 8)', () => {
  it('booking: an idempotency key (uuid) and the picked instant are optional', () => {
    expect(bookingRequestSchema.safeParse({ ...RULE, clientRequestId: S, startsAt: '2026-10-04T14:00:00Z' }).success).toBe(true);
    expect(bookingRequestSchema.safeParse({ ...RULE, clientRequestId: 'retry-1' }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...RULE, startsAt: '2026-10-04 17:00' }).success).toBe(false);
  });

  it('status: per-student events, each a real outcome', () => {
    expect(lessonStatusRequestSchema.safeParse({ event: 'complete', students: [{ studentId: S, event: 'mark_no_show' }] }).success).toBe(true);
    expect(lessonStatusRequestSchema.safeParse({ event: 'complete', students: [{ studentId: S, event: 'confirm' }] }).success).toBe(false);
  });

  it('proposal: an instant with offset and an optional short note; approve takes an override', () => {
    expect(lessonProposalRequestSchema.parse({ startsAt: '2026-10-06T18:30:00+03:00', note: ' سفر ' })).toEqual({
      startsAt: '2026-10-06T18:30:00+03:00',
      note: 'سفر',
    });
    expect(lessonProposalRequestSchema.safeParse({ startsAt: '2026-10-06 18:30' }).success).toBe(false);
    expect(lessonProposalRequestSchema.safeParse({ startsAt: '2026-10-06T18:30:00Z', note: 'x'.repeat(501) }).success).toBe(false);
    expect(proposalApproveSchema.safeParse({ override: { reason: ' ' } }).success).toBe(false);
    expect(proposalApproveSchema.parse({})).toEqual({});
  });

  it('settings: late-cancel hours null (OFF) or 1..168, horizon 1..12 weeks', () => {
    expect(settingsUpdateSchema.safeParse({ lateCancelHours: null }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ lateCancelHours: 24, bookingHorizonWeeks: 6 }).success).toBe(true);
    expect(settingsUpdateSchema.safeParse({ lateCancelHours: 0 }).success).toBe(false);
    expect(settingsUpdateSchema.safeParse({ bookingHorizonWeeks: 13 }).success).toBe(false);
  });
});
