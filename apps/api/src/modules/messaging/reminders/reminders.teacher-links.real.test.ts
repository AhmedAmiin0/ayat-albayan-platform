import { afterEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { ReportsSettings, TeacherReportLinks } from '@/modules/reporting/reports';
import { TeacherLessonLinks } from '@/modules/teaching/lesson-links';
import { sampleLesson } from './reminders.fakes';
import { ReminderTeacherLinks } from './reminders.teacher-links';

// owner 2026-11-06 «now we no more need url shortener»: the reminder path is wired without any
// database or ShortLinks at all, so it cannot insert a short_links row; the links are signed only.

const SECRET = 's'.repeat(40);
const TEACHER = '00000000-0000-4000-8000-0000000000b1';
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const TEACHER_ROW = { display_name_ar: 'هدى', phone_e164: '+966500000201', tz: 'Asia/Riyadh' };
const NONE = { join: '', report: { token: 'x', url: '', exp: 0 } };

describe('the reminder’s teacher links, wired for real', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('signed tokens and the page itself; no short link (no db, no /r/)', async () => {
    vi.stubEnv('WEB_ORIGIN', 'https://app.example');
    const settings = readerOf(ReportsSettings, { report_teacher_edit_hours: 24 });
    const reports = new TeacherReportLinks(settings, { secret: SECRET });
    const service = new ReminderTeacherLinks(new TeacherLessonLinks(reports, { secret: SECRET }));
    const lesson = sampleLesson({ id: LESSON, teacher: { ...TEACHER_ROW, id: TEACHER } });
    const now = new Date(Date.parse(lesson.starts_at) - 30 * 60_000);
    const built = await service.build([lesson], { minutesBefore: 60, now });
    const links = built.get(LESSON) ?? NONE;
    expect(links.report.url).toBe(`https://app.example/teacher-report/${links.report.token}`);
    expect(links.join).toHaveLength(71);
    expect(links.join).not.toBe(links.report.token);
    expect(JSON.stringify(links)).not.toContain('/r/');
  });
});
