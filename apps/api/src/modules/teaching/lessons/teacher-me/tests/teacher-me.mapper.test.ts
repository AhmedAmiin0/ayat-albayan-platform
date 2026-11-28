import { describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { toTeacherMe } from '@/modules/teaching/lessons/teacher-me/teacher-me.mapper';

const ME = {
  id: '00000000-0000-4000-8000-0000000000a1',
  display_name_ar: 'أبرار',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  meeting_link: null,
  meeting_mode: null,
  platform_classroom: false,
  students: [],
} as const;

describe('toTeacherMe (R-TCH-03)', () => {
  it('answers her row as it is', () => {
    expect(toTeacherMe({ ...ME, programs: [...ME.programs], students: [] })).toEqual(ME);
  });

  it('drops a column the answer does not name', () => {
    const wide = { ...ME, programs: [...ME.programs], students: [], phone_e164: '+201000000000' };
    expect(toTeacherMe(wide)).not.toHaveProperty('phone_e164');
  });

  it('a row that is no profile is a 500 response_invalid naming the path, never the value', () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const bad = { ...ME, id: 't1', programs: [...ME.programs], students: [] };
    expect(() => toTeacherMe(bad)).toThrow('response_invalid');
    expect(error).toHaveBeenCalledWith('response_invalid at id');
  });
});
