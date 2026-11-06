import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTeacherAlert } from './teacher-alert.fakes';
import type { AlertLesson } from './teacher-alert.plan';

// owner 2026-11-06: the new-student alert goes as teacher_lesson_v3 once approved.

const T1 = {
  id: 'T1',
  profile_id: 'P1',
  phone_e164: '+201001234567',
  tz: 'Africa/Cairo',
  display_name_ar: 'أ. خالد',
  meeting_mode: null,
};
const lessons: AlertLesson[] = [
  {
    id: 'L2',
    starts_at: '2026-10-11T14:00:00Z',
    ends_at: '2026-10-11T14:45:00Z',
    teacher: T1,
    meeting_link: 'https://meet.google.com/abc-defg-hij',
  },
  {
    id: 'L1',
    starts_at: '2026-10-04T14:00:00Z',
    ends_at: '2026-10-04T14:45:00Z',
    teacher: T1,
    meeting_link: 'https://meet.google.com/abc-defg-hij',
  },
];
const STUDENTS = [{ id: 's1', name: 'سهيلة', code: 'AB-0101' }];
const run = async (over: { v3?: boolean; approved?: boolean }) => {
  vi.stubEnv('WEB_ORIGIN', 'https://app.example');
  const fake = fakeTeacherAlert({ lessons, ...over });
  fake.queries.students.mockImplementation(async () => STUDENTS);
  await fake.alert.toTeachers({ lessonIds: ['L1', 'L2'], studentIds: ['s1'], kind: 'trial' });
  return fake;
};

describe('TeacherAlert with teacher_lesson_v3', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('approved: the first lesson as v3, its room in {{6}}, the join and report tokens as buttons', async () => {
    const { queries, links } = await run({ v3: true, approved: false });
    const [row] = queries.queue.mock.calls[0]?.[0] as {
      template_key: string;
      template_params: object;
      dedup_key: string;
    }[];
    expect(row?.template_key).toBe('teacher_lesson_v3');
    expect(row?.dedup_key).toBe('teacher_new_student:L1:T1');
    expect(row?.template_params).toMatchObject({
      '6': 'https://meet.google.com/abc-defg-hij',
      buttons: ['join-L1', 'rep-L1'],
    });
    expect(links.forLesson).toHaveBeenCalledTimes(1);
  });

  it('not approved: teacher_new_student as before, no links made', async () => {
    const { queries, links } = await run({ v3: false });
    const [row] = queries.queue.mock.calls[0]?.[0] as { template_key: string }[];
    expect(row?.template_key).toBe('teacher_new_student');
    expect(links.forLesson).not.toHaveBeenCalled();
  });

  it('neither sendable: nothing queued', async () => {
    const { queries } = await run({ v3: false, approved: false });
    expect(queries.queue).not.toHaveBeenCalled();
  });
});
