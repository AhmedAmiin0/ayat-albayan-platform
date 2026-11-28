import { describe, expect, it } from 'vitest';
import { teacherFixture, teacherRowFixture } from '../../testing/teachers';
import { teacherRoutes } from './teachers.routes';

const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const teacher = teacherFixture({ id: ID, username: 'ustadh.omar' });

describe('teacherRoutes (R-TCH-01)', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(teacherRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /teachers',
      'GET /teachers/:id',
      'POST /teachers',
      'PATCH /teachers/:id',
      'DELETE /teachers/:id',
    ]);
  });

  it('answers a page of rows with their counts and one teacher with her username', () => {
    const page = {
      items: [teacherRowFixture({ active_count: 2 })],
      total: 1,
      page: 1,
      pageSize: 25,
    };
    expect(teacherRoutes.list.response.parse(page)).toEqual(page);
    expect(teacherRoutes.get.response.parse(teacher)).toEqual(teacher);
  });

  it('pages 25 by default, trims the search and reads the column filters', () => {
    const query = teacherRoutes.list.query.parse({ search: ' ٠١٠ ', status: 'active' });
    expect(query).toEqual({ search: '٠١٠', status: 'active', page: 1, pageSize: 25 });
    expect(teacherRoutes.list.query.safeParse({ pageSize: '500' }).success).toBe(false);
  });

  it('creates with the default status and patches only the fields sent', () => {
    const body = {
      display_name_ar: 'أ. سارة',
      gender: 'female',
      programs: ['quran'],
      tz: 'Africa/Cairo',
    };
    expect(teacherRoutes.create.body.parse(body)).toMatchObject({ status: 'active' });
    expect(teacherRoutes.update.body.parse({ rate_60: 120 })).toEqual({ rate_60: 120 });
    expect(teacherRoutes.update.body.parse({ username: null })).toEqual({ username: null });
  });

  it.each(['get', 'update', 'remove'] as const)('%s refuses a bad id in the path', (name) => {
    expect(teacherRoutes[name].params.safeParse({ id: 'abc' }).success).toBe(false);
  });

  it('refuses a teacher with an unknown meeting mode or without her counts in a list', () => {
    expect(teacherRoutes.get.response.safeParse({ ...teacher, meeting_mode: 'zoom' }).success).toBe(
      false,
    );
    const page = { items: [teacher], total: 1, page: 1, pageSize: 25 };
    expect(teacherRoutes.list.response.safeParse(page).success).toBe(false);
  });
});
