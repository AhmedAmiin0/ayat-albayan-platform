import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { academyApp, studentRow } from '@/modules/sales/sales/academy/sales-academy.fakes';

type App = Awaited<ReturnType<typeof academyApp>>;
const INVALID = expect.objectContaining({ code: 'response_invalid' });

describe('/sales/students/all served from its route object', () => {
  let t: App;
  beforeAll(async () => {
    t = await academyApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.academy.students.mockResolvedValue({ rows: [studentRow()], total: 1 });
    t.roster.rules.mockResolvedValue([]);
    t.roster.packages.mockResolvedValue([]);
    t.roster.balances.mockResolvedValue([]);
    t.roster.lessons.mockResolvedValue([]);
  });

  it('a row with no package answers null and the recent attendance basis', async () => {
    const res = await t.get('/sales/students/all', 'salesA');
    expect(res.statusCode).toBe(200);
    const [row] = res.json().items;
    expect([row.package, row.attendance]).toEqual([null, { attended: 0, held: 0, basis: 'recent' }]);
  });

  it('a student with an unknown status is a 500 response_invalid, never sent', async () => {
    const row = Object.assign(studentRow(), { status: 'lost' });
    t.academy.students.mockResolvedValue({ rows: [row], total: 1 });
    const res = await t.get('/sales/students/all', 'salesA');
    expect([res.statusCode, res.json()]).toEqual([500, INVALID]);
  });

  it('an empty academy answers an empty page', async () => {
    t.academy.students.mockResolvedValue({ rows: [], total: 0 });
    const res = await t.get('/sales/students/all?page=3', 'salesA');
    expect(res.json()).toEqual({ items: [], total: 0, page: 3, pageSize: 25 });
  });

  it('a search past 100 characters is a 400 before anything is read', async () => {
    const res = await t.get(`/sales/students/all?search=${'x'.repeat(101)}`, 'salesA');
    expect(res.statusCode).toBe(400);
    expect(t.academy.students).not.toHaveBeenCalled();
  });

  it('a teacher is refused with 403 before anything is read', async () => {
    const res = await t.get('/sales/students/all', 'teacher');
    expect(res.statusCode).toBe(403);
    expect(t.academy.students).not.toHaveBeenCalled();
  });
});
