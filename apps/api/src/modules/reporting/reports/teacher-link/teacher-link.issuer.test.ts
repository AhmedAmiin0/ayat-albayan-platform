import { afterEach, describe, expect, it, vi } from 'vitest';
import { TeacherReportLinks } from './teacher-link.issuer';

const LESSON = '00000000-0000-4000-8000-0000000000d1';

describe('TeacherReportLinks.forLesson', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('the signed-in portal page; the v3 button suffix is the lesson id (no token)', () => {
    vi.stubEnv('WEB_ORIGIN', 'https://app.example');
    expect(new TeacherReportLinks().forLesson({ id: LESSON })).toEqual({
      suffix: LESSON,
      url: `https://app.example/teacher/report/${LESSON}`,
    });
  });

  it('the first origin of a list', () => {
    vi.stubEnv('WEB_ORIGIN', 'https://app.example,https://other.example');
    const link = new TeacherReportLinks().forLesson({ id: LESSON });
    expect(link?.url).toBe(`https://app.example/teacher/report/${LESSON}`);
  });

  it('no web origin: no link', () => {
    vi.stubEnv('WEB_ORIGIN', '');
    expect(new TeacherReportLinks().forLesson({ id: LESSON })).toBeNull();
  });
});
