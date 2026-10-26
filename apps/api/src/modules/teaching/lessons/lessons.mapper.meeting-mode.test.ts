import { describe, expect, it } from 'vitest';
import { lessonRow, TEACHER_ID } from './lessons.fakes';
import { toLessonView } from './lessons.mapper';

// LessonView.platform_classroom (migration 490): the lesson's own teacher decides (a substitute's
// mode applies), else the academy default; clients show or hide the fixed link by it alone.

const teacher = (meeting_mode: string | null) => ({ id: TEACHER_ID, display_name_ar: 'أبرار', display_name_en: null, tz: 'Africa/Cairo', meeting_mode });
const view = (mode: string | null, academyAuto?: boolean) =>
  toLessonView(lessonRow({ teacher: teacher(mode) }), { role: 'admin', seq: new Map(), academyAuto });

describe('toLessonView — platform_classroom', () => {
  it("the teacher's mode wins; null follows the academy default (false when not given)", () => {
    expect(view('platform', false).platform_classroom).toBe(true);
    expect(view('static', true).platform_classroom).toBe(false);
    expect(view(null, true).platform_classroom).toBe(true);
    expect(view(null).platform_classroom).toBe(false);
  });

  it('the fixed link stays on the view and the teacher carries no meeting_mode', () => {
    const v = view('platform', true);
    expect(v.meeting_link).toBe('https://meet.jit.si/abrar');
    expect(v.teacher).toEqual({ id: TEACHER_ID, display_name_ar: 'أبرار', display_name_en: null, tz: 'Africa/Cairo' });
  });
});
