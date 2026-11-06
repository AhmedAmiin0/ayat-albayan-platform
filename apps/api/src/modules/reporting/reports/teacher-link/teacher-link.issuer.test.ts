import { afterEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { ReportsSettings } from '@/modules/reporting/reports/reports.settings';
import { TeacherReportLinks } from './teacher-link.issuer';
import { verifyTeacherLink } from './teacher-link.token';

const SECRET = 's'.repeat(40);
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const A = '00000000-0000-4000-8000-0000000000b1';
const lesson = (teacherId: string) => ({ id: LESSON, teacherId, ends_at: '2026-11-05T12:45:00Z' });

const NONE = { token: '', url: '', exp: 0 };

function setup(secret: string | null = SECRET) {
  vi.stubEnv('WEB_ORIGIN', 'https://app.example');
  const settings = readerOf(ReportsSettings, { report_teacher_edit_hours: 24 });
  return new TeacherReportLinks(settings, { secret });
}

describe('TeacherReportLinks.forLesson', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('the page /teacher-report/<token> itself (no short link), until the end + the edit hours', async () => {
    const link = (await setup().forLesson(lesson(A))) ?? NONE;
    expect(link.url).toBe(`https://app.example/teacher-report/${link.token}`);
    const check = verifyTeacherLink(SECRET, link.token, new Date('2026-11-05T12:00:00Z'));
    expect(check).toMatchObject({ ok: true, payload: { lessonId: LESSON, teacherId: A } });
    expect(link.exp).toBe(Date.parse('2026-11-06T12:45:00Z') / 1000);
  });

  it('no secret: no link (the reminder keeps the signed-in page)', async () => {
    expect(await setup(null).forLesson(lesson(A))).toBeNull();
  });
});
