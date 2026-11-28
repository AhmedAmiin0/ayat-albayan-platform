import { describe, expect, it } from 'vitest';
import { meetingRoutes } from './meetings.routes';

const TEACHER = '0b6a0b8e-6d1a-4c3e-9a51-6f1c7f0a2b11';
const STUDENT = '1c7b1c9f-7e2b-4d4f-8b62-7a2d8a1b3c22';

describe('meetingRoutes (R-MEET-01)', () => {
  it('keeps the path the api serves today', () => {
    const { instant } = meetingRoutes;
    expect(`${instant.method} ${instant.path}`).toBe('POST /lessons/instant');
  });

  it('takes the students, the teacher and a lesson length', () => {
    const body = { studentIds: [STUDENT], teacherId: TEACHER, durationMin: 30 };
    expect(meetingRoutes.instant.body.parse(body)).toEqual(body);
  });

  it('answers the new lesson id, nothing else', () => {
    const { response } = meetingRoutes.instant;
    expect(response.parse({ lessonId: 'l-1' })).toEqual({ lessonId: 'l-1' });
    expect(response.safeParse({ id: 'l-1' }).success).toBe(false);
  });

  it('lets in a lesson writer, under the booking tag', () => {
    const { permissions, tags } = meetingRoutes.instant;
    expect({ permissions, tags }).toEqual({ permissions: ['lessons.write'], tags: ['booking'] });
  });
});
