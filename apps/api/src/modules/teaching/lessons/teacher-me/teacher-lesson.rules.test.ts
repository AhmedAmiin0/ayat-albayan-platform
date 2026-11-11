import { describe, expect, it } from 'vitest';
import { assertConfirmed, assertTeacherMayCancel } from './teacher-lesson.rules';

const now = new Date('2026-11-11T12:00:00Z');
const code = (fn: () => void): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    const res = (e as { getResponse?: () => unknown }).getResponse?.();
    return (res as { code?: string } | undefined)?.code ?? (e as Error).name;
  }
};

describe('assertTeacherMayCancel (docs/46 D3)', () => {
  it('an open lesson ahead passes', () => {
    expect(code(() => assertTeacherMayCancel({ status: 'confirmed', starts_at: '2026-11-11T13:00:00Z' }, now))).toBeNull();
  });

  it('started → lesson_started; closed → invalid_transition', () => {
    expect(code(() => assertTeacherMayCancel({ status: 'scheduled', starts_at: '2026-11-11T12:00:00Z' }, now))).toBe('lesson_started');
    expect(code(() => assertTeacherMayCancel({ status: 'completed', starts_at: '2026-11-12T12:00:00Z' }, now))).toBe('invalid_transition');
  });
});

describe('assertConfirmed', () => {
  it('ok passes; every other outcome throws', () => {
    expect(code(() => assertConfirmed('ok'))).toBeNull();
    expect(code(() => assertConfirmed('started'))).toBe('lesson_started');
    expect(code(() => assertConfirmed('closed'))).toBe('lesson_closed');
    expect(code(() => assertConfirmed('not_owner'))).not.toBeNull();
    expect(code(() => assertConfirmed('not_found'))).not.toBeNull();
  });
});
