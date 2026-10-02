import { describe, expect, it } from 'vitest';
import {
  ATTACHMENT_MAX_BYTES,
  attachmentRegisterSchema,
  attachmentUploadSchema,
  reportDraftSchema,
  reportSubmitSchema,
} from './schema.js';

const allGrades = {
  recitation: 'excellent',
  memorization: 'very_good',
  revision: 'good',
  tajweed: 'acceptable',
  engagement: 'needs_review',
  commitment: 'excellent',
} as const;
const full = { attendance: 'on_time', grades: allGrades, overall: 'very_good', expectedVersion: 0 } as const;

const messages = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : (r.error?.issues.map((i) => i.message) ?? []);

describe('reportDraftSchema (R-REP-02 autosave)', () => {
  it('accepts an empty draft and a partial one', () => {
    expect(reportDraftSchema.parse({})).toEqual({});
    expect(reportDraftSchema.parse({ recited: 'الفاتحة', grades: { tajweed: 'good' } })).toEqual({
      recited: 'الفاتحة',
      grades: { tajweed: 'good' },
    });
  });

  it('blank text becomes null so a cleared field clears; text is trimmed', () => {
    expect(reportDraftSchema.parse({ notes: '   ', homework: ' سورة الملك ' })).toEqual({
      notes: null,
      homework: 'سورة الملك',
    });
  });

  it.each([
    ['an unknown grade', { overall: 'great' }],
    ['an unknown rubric grade', { grades: { tajweed: 'A+' } }],
    ['an unknown attendance', { attendance: 'present' }],
    ['text over 4000 chars', { notes: 'x'.repeat(4001) }],
  ])('rejects %s', (_name, body) => {
    expect(reportDraftSchema.safeParse(body).success).toBe(false);
  });
});

describe('reportSubmitSchema (R-REP-02 validation)', () => {
  it('accepts the full form', () => {
    expect(reportSubmitSchema.safeParse(full).success).toBe(true);
  });

  it('attendance is required → missing_attendance', () => {
    expect(messages(reportSubmitSchema.safeParse({ ...full, attendance: undefined }))).toEqual([
      'missing_attendance',
    ]);
  });

  it.each([
    ['a missing rubric', { ...full, grades: { ...allGrades, commitment: null } }],
    ['no grades at all', { ...full, grades: undefined }],
    ['no overall grade', { ...full, overall: null }],
    ['late but ungraded', { attendance: 'late', expectedVersion: 0 }],
  ])('attended with %s → missing_grades', (_name, body) => {
    expect(messages(reportSubmitSchema.safeParse(body))).toEqual(['missing_grades']);
  });

  it.each(['absent', 'excused'] as const)('%s needs no grades', (attendance) => {
    expect(reportSubmitSchema.safeParse({ attendance, expectedVersion: 2 }).success).toBe(true);
  });

  it('expectedVersion is required and ≥ 0', () => {
    expect(reportSubmitSchema.safeParse({ ...full, expectedVersion: undefined }).success).toBe(false);
    expect(reportSubmitSchema.safeParse({ ...full, expectedVersion: -1 }).success).toBe(false);
  });
});

describe('attachments (R-REP-02, bucket report-attachments)', () => {
  it.each(['image/jpeg', 'application/pdf', 'audio/mpeg', 'audio/mp4'])('accepts %s', (mime) => {
    expect(attachmentUploadSchema.safeParse({ mime, size: 1000 }).success).toBe(true);
  });

  it('rejects other types → attachment_type, and > 25 MB → attachment_too_large', () => {
    expect(messages(attachmentUploadSchema.safeParse({ mime: 'video/mp4', size: 10 }))).toEqual([
      'attachment_type',
    ]);
    const big = attachmentUploadSchema.safeParse({ mime: 'image/png', size: ATTACHMENT_MAX_BYTES + 1 });
    expect(messages(big)).toEqual(['attachment_too_large']);
    expect(attachmentUploadSchema.safeParse({ mime: 'image/png', size: 0 }).success).toBe(false);
  });

  it('register needs the uploaded path', () => {
    expect(attachmentRegisterSchema.safeParse({ mime: 'image/png', size: 5 }).success).toBe(false);
    expect(attachmentRegisterSchema.safeParse({ mime: 'image/png', size: 5, path: 'r/x.png' }).success).toBe(true);
  });
});
