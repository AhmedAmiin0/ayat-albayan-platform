import { describe, expect, it } from 'vitest';
import { assistantsRoutes as routes } from '..';

const STUDENT = '0b9f4a3e-7c1d-4e2a-9b6f-1d2c3e4f5a6b';
const PROFILE = '1c8e5b4f-8d2e-4f3b-8c7a-2e3d4f5a6b7c';
const assistant = { profile_id: PROFILE, full_name: 'سارة' };
const lesson = {
  lesson_id: 'L',
  starts_at: '2026-11-16T17:00:00.000Z',
  ends_at: '2026-11-16T17:30:00.000Z',
  status: 'scheduled',
  teacher_name: 'أبرار',
  student_names: ['ليلى'],
};

describe('assistantsRoutes (R-CLS)', () => {
  it.each([
    ['all', 'GET /assistants'],
    ['mine', 'GET /assistants/me/lessons'],
    ['forStudent', 'GET /students/:id/assistants'],
    ['assign', 'POST /students/:id/assistants'],
    ['remove', 'DELETE /students/:id/assistants/:profileId'],
  ] as const)('%s keeps the path the api serves today', (key, wire) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
  });

  it('still answers 400 for a student or profile id that is not a uuid', () => {
    expect(routes.forStudent.params.safeParse({ id: 'nope' }).success).toBe(false);
    const both = { id: STUDENT, profileId: PROFILE };
    expect(routes.remove.params.parse(both)).toEqual(both);
    expect(routes.remove.params.safeParse({ id: STUDENT, profileId: 'x' }).success).toBe(false);
  });

  it('reads the day as two instants and refuses a plain date', () => {
    const day = { from: '2026-11-16T00:00:00.000Z', to: '2026-11-17T00:00:00.000Z' };
    expect(routes.mine.query.parse(day)).toEqual(day);
    expect(routes.mine.query.safeParse({ from: '2026-11-16', to: day.to }).success).toBe(false);
    expect(routes.mine.query.safeParse({ from: day.from }).success).toBe(false);
  });

  it('assigns by a profile uuid', () => {
    expect(routes.assign.body.parse({ profileId: PROFILE })).toEqual({ profileId: PROFILE });
    expect(routes.assign.body.safeParse({ profileId: 'x' }).success).toBe(false);
  });

  it('answers the assistant lists after every read and write', () => {
    for (const key of ['all', 'forStudent', 'assign', 'remove'] as const) {
      expect(routes[key].response.parse([assistant])).toEqual([assistant]);
    }
    expect(routes.all.response.safeParse([{ profile_id: PROFILE }]).success).toBe(false);
  });

  it('answers the lessons and refuses one in an unknown state', () => {
    expect(routes.mine.response.parse([lesson])).toEqual([lesson]);
    expect(routes.mine.response.safeParse([{ ...lesson, status: 'lost' }]).success).toBe(false);
  });
});
