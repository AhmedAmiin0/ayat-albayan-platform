import { describe, expect, it } from 'vitest';
import { RECEIPT_MAX_BYTES, RECEIPT_MIMES } from '../money/schemas.js';
import {
  INVOICE_MAX_BYTES,
  INVOICE_MIMES,
  bookingKindOf,
  invoiceInputSchema,
  invoiceUploadSchema,
  isSingleLesson,
} from './booking-extras.js';
import { bookingRequestSchema } from './scheduling.js';

const T = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const S1 = '0b7c6a52-6a7e-4b38-9a3f-1c2d3e4f5a61';
const S2 = '0b7c6a52-6a7e-4b38-9a3f-1c2d3e4f5a62';
const LESSON = '1b7c6a52-6a7e-4b38-9a3f-1c2d3e4f5a99';
const LEAD = '9d8e7f60-1a2b-4c3d-8e9f-0a1b2c3d4e5f';
const RULE = { teacherId: T, byday: [0], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-10-04' };
const parse = (body: object) => bookingRequestSchema.safeParse({ ...RULE, ...body });
const problems = (body: object) => {
  const r = parse(body);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('bookingKindOf / isSingleLesson', () => {
  it.each([
    [{}, 'package'],
    [{ package: 'trial' }, 'trial'],
    [{ package: '8' }, 'package'],
    [{ kind: 'makeup' }, 'makeup'],
    [{ kind: 'makeup', package: '8' }, 'makeup'],
    [{ kind: 'trial', package: 'trial' }, 'trial'],
  ] as const)('%j → %s', (req, kind) => {
    expect(bookingKindOf(req)).toBe(kind);
  });

  it('only a package repeats', () => {
    expect([isSingleLesson('trial'), isSingleLesson('makeup'), isSingleLesson('package')]).toEqual([true, true, false]);
  });
});

describe('booking body refine: kind × package × students × makeup link', () => {
  it('old bodies keep working: no kind, package 8 / trial', () => {
    expect(parse({ studentIds: [S1], package: '8' }).success).toBe(true);
    expect(parse({ studentIds: [S1], package: 'trial' }).success).toBe(true);
  });

  it('a body without kind and without package is rejected', () => {
    expect(problems({ studentIds: [S1] })).toEqual(['package_size']);
  });

  it('kind trial needs package trial; kind package needs a paid size', () => {
    expect(problems({ kind: 'trial', studentIds: [S1], package: '8' })).toEqual(['trial_package']);
    expect(problems({ kind: 'package', studentIds: [S1], package: 'trial' })).toEqual(['package_size']);
    expect(parse({ kind: 'package', studentIds: [S1], package: '12' }).success).toBe(true);
  });

  it('a makeup is one existing student with a missed lesson and no package', () => {
    const ok = parse({ kind: 'makeup', studentIds: [S1], makeupOfLessonId: LESSON });
    expect(ok.success).toBe(true);
    expect(problems({ kind: 'makeup', studentIds: [S1] })).toEqual(['makeup_lesson_required']);
    expect(problems({ kind: 'makeup', studentIds: [S1, S2], makeupOfLessonId: LESSON })).toEqual(['makeup_one_student']);
    expect(problems({ kind: 'makeup', studentIds: [S1], leadId: LEAD, makeupOfLessonId: LESSON })).toEqual([
      'makeup_one_student',
    ]);
  });

  it('a makeup has no new-student branch', () => {
    const body = {
      kind: 'makeup',
      makeupOfLessonId: LESSON,
      leadId: LEAD,
      guardian: { name: 'أم سهيلة', phone_e164: '0501234567', tz: 'Asia/Riyadh' },
      newStudent: { name: 'سهيلة', tz: 'Asia/Riyadh' },
    };
    expect(problems(body)).toEqual(['makeup_one_student']);
  });

  it('makeupOfLessonId is only for a makeup', () => {
    expect(problems({ studentIds: [S1], package: '8', makeupOfLessonId: LESSON })).toEqual(['makeup_only']);
  });

  it('accepts an invoice of either source; presence is not checked here (/booking/check has none)', () => {
    const pkg = { studentIds: [S1], package: '8' };
    expect(parse({ ...pkg, invoice: { source: 'upload', path: 'req/a.png' } }).success).toBe(true);
    expect(parse({ ...pkg, invoice: { source: 'whatsapp', messageId: LESSON } }).success).toBe(true);
    expect(parse(pkg).success).toBe(true);
    expect(parse({ ...pkg, invoice: { source: 'whatsapp', messageId: 'x' } }).success).toBe(false);
    expect(parse({ ...pkg, invoice: { source: 'ftp', path: 'x' } }).success).toBe(false);
  });
});

describe('invoice schemas', () => {
  it('accept the same files as receipts (the constants are spelled out to avoid an import cycle)', () => {
    expect(INVOICE_MIMES).toEqual(RECEIPT_MIMES);
    expect(INVOICE_MAX_BYTES).toBe(RECEIPT_MAX_BYTES);
  });

  it('upload: image/PDF up to 10 MB', () => {
    const base = { clientRequestId: LESSON, mime: 'application/pdf', size: 10 * 1024 * 1024 };
    expect(invoiceUploadSchema.safeParse(base).success).toBe(true);
    const type = invoiceUploadSchema.safeParse({ ...base, mime: 'audio/mpeg' });
    expect(type.error?.issues[0]?.message).toBe('invoice_type');
    const big = invoiceUploadSchema.safeParse({ ...base, size: base.size + 1 });
    expect(big.error?.issues[0]?.message).toBe('invoice_too_large');
    expect(invoiceUploadSchema.safeParse({ ...base, size: 0 }).success).toBe(false);
  });

  it('input: path must be non-empty', () => {
    expect(invoiceInputSchema.safeParse({ source: 'upload', path: '' }).success).toBe(false);
  });
});
