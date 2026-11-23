import { describe, expect, it } from 'vitest';
import { PUBLIC_SETTING_DEFAULTS } from '../../public.js';
import { SETTINGS_REGISTRY } from '../../registry.js';
import { VALUE_GROUPS } from '../../value-groups.js';
import { TEACHER_PAGE_KEYS, TEACHER_PAGE_SWITCH, teacherGateOpen, teacherPageOn } from './teacher-pages.js';

const off = { ...PUBLIC_SETTING_DEFAULTS };

describe('teacher page switches (owner 2026-11-13)', () => {
  it('seven public bool switches, off by default, in «القيم» › صفحات المعلم', () => {
    expect(Object.values(TEACHER_PAGE_SWITCH).sort()).toEqual([...TEACHER_PAGE_KEYS].sort());
    for (const key of TEACHER_PAGE_KEYS) {
      expect(SETTINGS_REGISTRY[key]).toMatchObject({ type: 'bool', default: false, public: true, group: 'teachers' });
      expect(PUBLIC_SETTING_DEFAULTS[key]).toBe(false);
    }
    expect(VALUE_GROUPS.teachers).toEqual(TEACHER_PAGE_KEYS);
  });

  it('each page reads its own switch only', () => {
    const config = { ...off, teacher_earnings_enabled: true };
    expect(teacherPageOn(config, 'earnings')).toBe(true);
    expect(teacherPageOn(config, 'statements')).toBe(false);
    expect(teacherPageOn(off, 'chats')).toBe(false);
  });

  it('the meetings routes open with either meetings switch, and stay shut with both off', () => {
    expect(teacherGateOpen(off, 'meetings')).toBe(false);
    expect(teacherGateOpen({ ...off, teacher_internal_meetings_enabled: true }, 'meetings')).toBe(true);
    expect(teacherGateOpen({ ...off, teacher_scheduled_meetings_enabled: true }, 'meetings')).toBe(true);
    expect(teacherGateOpen({ ...off, teacher_feedback_enabled: true }, 'feedback')).toBe(true);
  });
});
