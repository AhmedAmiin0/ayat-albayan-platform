import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { at, fakeJob as setup, sampleLesson } from './reminders.fakes';
import { planReminders } from './reminders.plan';

// R-NOT-03 (owner 2026-10-12): the teacher's WhatsApp reminder can be switched off in /admin/settings.
describe('settings.teacher_whatsapp_lesson_reminder', () => {
  beforeEach(() => vi.stubEnv('LIVEKIT_URL', ''));
  afterEach(() => vi.unstubAllEnvs());

  it('ON (the default): the teacher’s reminder is queued with the guardians’', async () => {
    const { job, queued } = setup();
    await job.runOnce(at('2026-10-04T13:10:00Z'));
    expect(queued.map((r) => r.template_key)).toContain('teacher_lesson_reminder');
  });

  it('OFF: no teacher_lesson_reminder, the guardians’ reminders unchanged', async () => {
    const { job, queued } = setup({ settings: { teacher_whatsapp_lesson_reminder: false } });
    await job.runOnce(at('2026-10-04T13:10:00Z'));
    expect(queued.map((r) => r.template_key)).toEqual(['lesson_reminder', 'lesson_reminder']);
  });

  it('planReminders: teacherReminders false drops only the teacher row', () => {
    const input = { lessons: [sampleLesson()], minutesBefore: 60, dayBefore: false, now: at('2026-10-04T13:10:00Z') };
    const keys = (teacherReminders?: boolean) => planReminders({ ...input, teacherReminders }).map((r) => r.template_key);
    expect(keys()).toEqual(['lesson_reminder', 'lesson_reminder', 'teacher_lesson_reminder']);
    expect(keys(true)).toEqual(keys());
    expect(keys(false)).toEqual(['lesson_reminder', 'lesson_reminder']);
  });

  it('planReminders: never to an inactive teacher or one whose login was disabled (owner 2026-10-25)', () => {
    const base = sampleLesson();
    const keys = (teacher: Partial<NonNullable<typeof base.teacher>>) =>
      planReminders({
        lessons: [{ ...base, teacher: base.teacher && { ...base.teacher, ...teacher } }],
        minutesBefore: 60,
        dayBefore: false,
        now: at('2026-10-04T13:10:00Z'),
      }).map((r) => r.template_key);
    expect(keys({ status: 'active', profile: { disabled_at: null } })).toContain('teacher_lesson_reminder');
    expect(keys({ status: 'inactive' })).toEqual(['lesson_reminder', 'lesson_reminder']);
    expect(keys({ profile: { disabled_at: '2026-10-25T00:00:00Z' } })).toEqual(['lesson_reminder', 'lesson_reminder']);
  });
});
