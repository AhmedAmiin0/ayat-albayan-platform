import { afterEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import type { ShortLinks } from '@/modules/platform/short-links';
import { ReportsSettings } from '@/modules/reporting/reports/reports.settings';
import { TeacherReportLinks } from './teacher-link.issuer';
import { verifyTeacherLink } from './teacher-link.token';

const SECRET = 's'.repeat(40);
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const A = '00000000-0000-4000-8000-0000000000b1';
const B = '00000000-0000-4000-8000-0000000000b2';
const lesson = (teacherId: string) => ({ id: LESSON, teacherId, ends_at: '2026-11-05T12:45:00Z' });

function setup(secret: string | null = SECRET) {
  vi.stubEnv('WEB_ORIGIN', 'https://app.example');
  const links = {
    forTarget: vi.fn(
      async (_t: { subject: string; url: string; expiresAt: Date }) => 'https://api.example/r/x',
    ),
  };
  const settings = readerOf(ReportsSettings, { report_teacher_edit_hours: 24 });
  const issuer = new TeacherReportLinks(links as unknown as ShortLinks, settings, { secret });
  return { links, issuer };
}

describe('TeacherReportLinks.forLesson', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('a short link to /teacher-report/<token>, expiring at the end + the edit hours', async () => {
    const { links, issuer } = setup();
    expect(await issuer.forLesson(lesson(A))).toBe('https://api.example/r/x');
    const call = links.forTarget.mock.calls[0]?.[0] ?? { url: '', expiresAt: new Date(0) };
    const token = call.url.replace('https://app.example/teacher-report/', '');
    const check = verifyTeacherLink(SECRET, token, new Date('2026-11-05T12:00:00Z'));
    expect(check).toMatchObject({ ok: true, payload: { lessonId: LESSON, teacherId: A } });
    expect(call.expiresAt).toEqual(new Date('2026-11-06T12:45:00Z'));
  });

  it('a substitute teacher gets their own code: the old teacher’s code is never re-pointed', async () => {
    const { links, issuer } = setup();
    await issuer.forLesson(lesson(A));
    await issuer.forLesson(lesson(B));
    const subjects = links.forTarget.mock.calls.map((c) => c[0].subject);
    expect(subjects).toEqual([`${LESSON}:${A}`, `${LESSON}:${B}`]);
  });

  it('no secret: no link (the reminder keeps the signed-in page)', async () => {
    expect(await setup(null).issuer.forLesson(lesson(A))).toBeNull();
  });
});
