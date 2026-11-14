import { afterEach, describe, expect, it, vi } from 'vitest';
import { TeacherReportLinks } from '@/modules/reporting/reports';
import { TeacherLessonLinks } from '@/modules/teaching/lesson-links';
import { sampleLesson } from './reminders.fakes';
import { ReminderTeacherLinks } from './reminders.teacher-links';

// owner 2026-11-06 «now we no more need url shortener»: the reminder path is wired without any
// database or ShortLinks at all, so it cannot insert a short_links row (owner 2026-11-14: the
// report link is the signed-in portal page).

const SECRET = 's'.repeat(40);
const TEACHER = '00000000-0000-4000-8000-0000000000b1';
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const TEACHER_ROW = { display_name_ar: 'هدى', phone_e164: '+966500000201', tz: 'Asia/Riyadh' };
const NONE = { join: '', report: { suffix: 'x', url: '' } };

describe('the reminder’s teacher links, wired for real', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('a signed join token and the portal page; no short link (no db, no /r/)', async () => {
    vi.stubEnv('WEB_ORIGIN', 'https://app.example');
    const lessonLinks = new TeacherLessonLinks(new TeacherReportLinks(), { secret: SECRET });
    const service = new ReminderTeacherLinks(lessonLinks);
    const lesson = sampleLesson({ id: LESSON, teacher: { ...TEACHER_ROW, id: TEACHER } });
    const now = new Date(Date.parse(lesson.starts_at) - 30 * 60_000);
    const built = await service.build([lesson], { minutesBefore: 60, now });
    const links = built.get(LESSON) ?? NONE;
    expect(links.report).toEqual({ suffix: LESSON, url: `https://app.example/teacher/report/${LESSON}` });
    expect(links.join).toHaveLength(71);
    expect(links.join).not.toBe(LESSON);
    expect(JSON.stringify(links)).not.toContain('/r/');
  });
});
