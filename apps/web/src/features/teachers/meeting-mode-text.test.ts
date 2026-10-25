import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { academyOptionText, effectivePlatform, knownAcademyAuto } from './meeting-mode-text';

describe('knownAcademyAuto', () => {
  it('GET /settings/public answered: its value, whatever the teacher', () => {
    expect(knownAcademyAuto(true, { meeting_mode: null, platform_classroom: false })).toBe(true);
    expect(knownAcademyAuto(false, null)).toBe(false);
  });

  it('not answered: an academy-mode teacher’s resolved platform_classroom', () => {
    expect(knownAcademyAuto(undefined, { meeting_mode: null, platform_classroom: true })).toBe(true);
    expect(knownAcademyAuto(undefined, { meeting_mode: null, platform_classroom: false })).toBe(false);
  });

  it('not answered and nothing to go by (a new teacher, or a teacher with a mode of their own): unknown', () => {
    expect(knownAcademyAuto(undefined, null)).toBeNull();
    expect(knownAcademyAuto(undefined, { meeting_mode: 'static', platform_classroom: false })).toBeNull();
  });
});

describe('effectivePlatform', () => {
  it('a set mode needs no academy setting; null follows it, unknown stays unknown', () => {
    expect(effectivePlatform('platform', null)).toBe(true);
    expect(effectivePlatform('static', true)).toBe(false);
    expect(effectivePlatform(null, true)).toBe(true);
    expect(effectivePlatform(null, null)).toBeNull();
  });
});

it('academyOptionText says what the academy option resolves to', () => {
  expect(academyOptionText(true)).toBe(`${t.teachers.meetingModeOption.academy} ${t.teachers.meetingModeResolves.platform}`);
});

it('academyOptionText is the bare label while the academy default is unknown', () => {
  expect(academyOptionText(null)).toBe(t.teachers.meetingModeOption.academy);
});
