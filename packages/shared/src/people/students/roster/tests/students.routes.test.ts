import { STUDENT_STATUSES } from '@ab/catalog';
import { describe, expect, it } from 'vitest';
import { studentRoutes } from '../students.routes';
import { listItem, profile, row, ID, ID2 } from './students.samples';

describe('studentRoutes (R-STU-01..05)', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(studentRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /students',
      'GET /students/status-counts',
      'GET /students/teacher-options',
      'GET /students/:id',
      'POST /students',
      'PATCH /students/:id',
      'DELETE /students/:id',
      'POST /students/:id/merge',
    ]);
  });

  it('answers a page of rows and a full profile unchanged', () => {
    const page = { items: [listItem], total: 1, page: 1, pageSize: 20 };
    expect(studentRoutes.list.response.parse(page)).toEqual(page);
    expect(studentRoutes.get.response.parse(profile)).toEqual(profile);
    expect(studentRoutes.create.response.parse(row)).toEqual(row);
    expect(studentRoutes.update.response.parse(row)).toEqual(row);
  });

  it('reads the list filters, the column sort and 20 a page', () => {
    const query = studentRoutes.list.query.parse({ status: 'trial,active', teacher: 'none' });
    expect(query).toMatchObject({ search: '', page: 1, pageSize: 20 });
    expect(query).toMatchObject({ status: ['trial', 'active'], teacher: 'none' });
  });

  it('counts every status, and refuses a count without one', () => {
    const counts = Object.fromEntries(STUDENT_STATUSES.map((s, i) => [s, i]));
    expect(studentRoutes.statusCounts.response.parse(counts)).toEqual(counts);
    const { churned: _gone, ...short } = counts;
    expect(studentRoutes.statusCounts.response.safeParse(short).success).toBe(false);
  });

  it('takes a guardian id or a new guardian on create, never both or none', () => {
    const base = { name: 'سهيلة', tz: 'Asia/Riyadh' };
    const guardian = { name: 'أم سهيلة', phone_e164: '0501234567', tz: 'Asia/Riyadh' };
    const byId = studentRoutes.create.body.parse({ ...base, guardian_id: ID });
    expect(byId).toMatchObject({ force: false, program: 'quran', status: 'new' });
    const both = { ...base, guardian_id: ID, guardian };
    expect(studentRoutes.create.body.safeParse(both).success).toBe(false);
    expect(studentRoutes.create.body.safeParse(base).success).toBe(false);
  });

  it('patches only what was sent and keeps blanks as null', () => {
    expect(studentRoutes.update.body.parse({ level: 'جزء عم' })).toEqual({ level: 'جزء عم' });
    expect(studentRoutes.update.body.parse({ notes: '' })).toEqual({ notes: null });
  });

  it('merges one student id into the path id and answers the merge id', () => {
    const merged = studentRoutes.merge.body.parse({ merged_id: ID2 });
    expect(merged).toEqual({ merged_id: ID2 });
    expect(studentRoutes.merge.body.safeParse({ merged_id: 'x' }).success).toBe(false);
    expect(studentRoutes.merge.response.parse({ merge_id: ID })).toEqual({ merge_id: ID });
  });

  it.each([
    ['get', { id: 'abc' }],
    ['update', { id: 'abc' }],
    ['remove', { id: 'abc' }],
  ] as const)('refuses a bad id on %s', (name, params) => {
    expect(studentRoutes[name].params.safeParse(params).success).toBe(false);
  });
});
