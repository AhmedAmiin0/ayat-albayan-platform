import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { at, fakeJob, sampleLesson } from './reminders.fakes';

// Two teachers in one tick (teachers.meeting_mode, migration 490): one holds lessons in our
// classroom, one keeps the fixed link, whatever the academy default says.

const NOW = at('2026-10-04T13:10:00Z');
const teacher = (id: string, meeting_mode: 'static' | 'platform') => ({ id, display_name_ar: 'هدى', phone_e164: '+966500000201', tz: 'Asia/Riyadh', meeting_mode });
const lessons = [
  sampleLesson({ id: 'lesson-p', teacher: teacher('t-p', 'platform') }),
  sampleLesson({ id: 'lesson-s', teacher: teacher('t-s', 'static') }),
];

describe('RemindersJob — per-teacher meeting mode', () => {
  beforeEach(() => {
    vi.stubEnv('WEB_ORIGIN', 'https://app.example');
    vi.stubEnv('LIVEKIT_URL', 'wss://livekit.example');
    vi.stubEnv('LIVEKIT_API_KEY', 'key');
    vi.stubEnv('LIVEKIT_API_SECRET', 'secret');
  });
  afterEach(() => vi.unstubAllEnvs());

  for (const auto of [false, true]) {
    it(`academy ${auto ? 'ON' : 'OFF'}: the platform lesson goes out with the classroom, the static one with its fixed link`, async () => {
      const { job, queries, queued } = fakeJob({ settings: { meeting_link_auto: auto }, approved: ['lesson_join_link'], lessons });
      await job.runOnce(NOW);
      const keys = (id: string) => queued.filter((r) => r.lesson_id === id).map((r) => r.template_key);
      expect(keys('lesson-p')).toEqual(['lesson_reminder_plain', 'lesson_reminder_plain', 'teacher_lesson_reminder']);
      expect(keys('lesson-s')).toEqual(['lesson_reminder', 'lesson_reminder', 'teacher_lesson_reminder']);
      const teacherRow = (id: string) => queued.find((r) => r.lesson_id === id && r.template_key === 'teacher_lesson_reminder');
      expect(teacherRow('lesson-p')?.template_params['2']).toContain('https://app.example/classroom/lesson-p');
      expect(JSON.stringify(teacherRow('lesson-s')?.template_params)).toContain('meet.jit.si');
      const families = queries.roomLinks.mock.calls[0]?.[0] ?? [];
      expect([...new Set(families.map((c) => c.lessonId))]).toEqual(['lesson-p']);
    });
  }
});
