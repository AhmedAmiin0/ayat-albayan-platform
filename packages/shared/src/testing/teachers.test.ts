import { describe, expect, it } from 'vitest';
import { teacherFixture, teacherRowFixture, timeOffFixture } from './teachers';

describe('teacher fixtures', () => {
  it('keep the fields a test names and fill the rest', () => {
    expect(teacherFixture({ id: 't9' })).toMatchObject({ id: 't9', status: 'active' });
    expect(teacherRowFixture({ id: 't9' }).id).toBe('t9');
  });

  it('build a time-off row from its window', () => {
    const off = timeOffFixture({ starts_at: '2026-09-01T00:00:00Z' });
    expect(off.starts_at).toBe('2026-09-01T00:00:00Z');
  });
});
