import { afterEach, describe, expect, it, vi } from 'vitest';
import { TeacherJoin } from './join.service';
import { joinExpiry, signTeacherJoin } from './join-token';
import type { JoinLesson } from './join-target';
import type { LessonLinksRepo } from './lesson-links.repo';
import type { LessonLinksSettings } from './lesson-links.settings';

const SECRET = 's'.repeat(40);
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const T = '00000000-0000-4000-8000-0000000000b1';
const NOW = new Date('2026-11-06T11:55:00Z');
const row = (over: Partial<JoinLesson> = {}): JoinLesson => ({
  id: LESSON,
  teacher_id: T,
  status: 'scheduled',
  ends_at: '2026-11-06T12:30:00Z',
  meeting_link: 'https://evil.example/phish',
  meeting_mode: 'platform',
  ...over,
});
const token = signTeacherJoin(SECRET, {
  lessonId: LESSON,
  teacherId: T,
  exp: joinExpiry('2026-11-06T12:30:00Z'),
});

function setup(lesson: JoinLesson | null, secret: string | null = SECRET) {
  vi.stubEnv('WEB_ORIGIN', 'https://app.example');
  const repo = { joinLesson: vi.fn(async () => lesson) };
  const settings = { read: vi.fn(async () => ({ meeting_link_auto: false })) };
  return new TeacherJoin(
    repo as unknown as LessonLinksRepo,
    settings as unknown as LessonLinksSettings,
    {
      secret,
    },
  );
}

describe('TeacherJoin.target', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('a valid token: the lesson’s room read now (a platform lesson: our classroom, not the stored host)', async () => {
    expect(await setup(row()).target(token, NOW)).toBe(`https://app.example/classroom/${LESSON}`);
  });

  it('refused: no secret, a forged token, another teacher now, or no lesson', async () => {
    expect(await setup(row(), null).target(token, NOW)).toBeNull();
    expect(
      await setup(row()).target(
        signTeacherJoin('x'.repeat(40), { lessonId: LESSON, teacherId: T, exp: 2e9 }),
        NOW,
      ),
    ).toBeNull();
    expect(
      await setup(row({ teacher_id: '00000000-0000-4000-8000-0000000000b2' })).target(token, NOW),
    ).toBeNull();
    expect(await setup(null).target(token, NOW)).toBeNull();
  });
});
