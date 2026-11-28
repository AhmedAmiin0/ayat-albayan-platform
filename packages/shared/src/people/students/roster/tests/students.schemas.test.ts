import { describe, expect, it } from 'vitest';
import { hasOneGuardian, studentCreateRequestSchema, studentPatchSchema } from '../students.schemas';

const GUARDIAN = { name: 'ام جود', phone_e164: '0501234567', tz: 'Asia/Riyadh' };

describe('students request schemas (R-STU-02..05)', () => {
  it('a one-field patch does not reset status or program to their defaults', () => {
    expect(studentPatchSchema.parse({ level: 'جزء عم' })).toEqual({ level: 'جزء عم' });
  });

  it.each([
    ['an unknown status', { status: 'gone' }],
    ['a link that is not a url', { meeting_link_override: 'zoom' }],
    ['an unknown time zone', { tz: 'Mars/Base' }],
  ])('a patch refuses %s', (_name, patch) => {
    expect(studentPatchSchema.safeParse(patch).success).toBe(false);
  });

  it('create normalises the guardian phone and defaults status, program and force', () => {
    const body = { name: 'سهيلة', tz: 'Asia/Riyadh', guardian: GUARDIAN };
    const dto = studentCreateRequestSchema.parse(body);
    expect(dto.guardian?.phone_e164).toBe('+966501234567');
    expect(dto).toMatchObject({ status: 'new', program: 'quran', force: false });
  });

  it.each([
    [{}, false],
    [{ guardian_id: 'g1' }, true],
    [{ guardian: GUARDIAN }, true],
    [{ guardian_id: 'g1', guardian: GUARDIAN }, false],
  ])('hasOneGuardian(%o) is %s', (choice, expected) => {
    expect(hasOneGuardian(choice)).toBe(expected);
  });
});
