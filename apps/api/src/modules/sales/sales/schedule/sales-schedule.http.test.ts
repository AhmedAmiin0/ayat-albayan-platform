import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { academyApp, scheduleRow } from '../academy/sales-academy.fakes';

type App = Awaited<ReturnType<typeof academyApp>>;
// The lesson's meeting_link and platform_classroom are in since owner 2026-10-26; nothing else secret.
const ALLOWED = new Set(['meeting_link', 'platform_classroom']);
const SECRET = /price|amount|note|reason|rate|phone|meeting|link|attendance|secret|سر/i;
const keys = (v: unknown): string[] =>
  v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : [];
const TC = 'c2000000-0000-4000-8000-0000000000c2';

// Owner report 2026-10-12 («it is not seeing the schedule»): GET /sales/schedule, read-only, whitelisted.
describe('GET /sales/schedule over HTTP', () => {
  let t: App;
  beforeAll(async () => {
    t = await academyApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.schedule.day.mockResolvedValue([scheduleRow(), scheduleRow({ id: 'les-3', rule: null, makeup_of_id: 'les-0', status: 'completed' })]);
  });

  it('answers a salesperson; admin, teacher, classroom assistant and guardian get 403', async () => {
    expect((await t.get('/sales/schedule?date=2026-10-11', 'salesA')).statusCode).toBe(200);
    for (const token of ['admin', 'teacher', 'assistant', 'guardian'] as const) {
      expect([token, (await t.get('/sales/schedule', token)).statusCode]).toEqual([token, 403]);
    }
  });

  it('one Riyadh day: [21:00Z of the day before, 21:00Z of the day), the teacher filter passed on', async () => {
    const res = await t.get(`/sales/schedule?date=2026-10-11&teacherId=${TC}`, 'salesB');
    expect(res.json().date).toBe('2026-10-11');
    expect(t.schedule.day).toHaveBeenCalledWith({
      from: new Date('2026-10-10T21:00:00.000Z'),
      to: new Date('2026-10-11T21:00:00.000Z'),
      teacherId: TC,
    });
  });

  it('whitelisted lessons: time, teacher, students, status, badges and the lesson link; no note, reason or money', async () => {
    const res = await t.get('/sales/schedule?date=2026-10-11', 'salesA');
    expect(res.json().lessons).toEqual([
      {
        id: 'les-2', starts_at: '2026-10-11T16:00:00.000Z', ends_at: '2026-10-11T16:30:00.000Z', status: 'confirmed', trial: true, makeup: false,
        meeting_link: 'https://meet.example.org/les-2', platform_classroom: false,
        teacher: { id: 'tc1', display_name_ar: 'أبرار', display_name_en: 'Abrar' }, students: [{ id: 's1', code: 'AB-0101', name: 'ياسمين', mine: true }],
      },
      expect.objectContaining({ id: 'les-3', status: 'completed', trial: false, makeup: true }),
    ]);
    expect(keys(res.json()).filter((k) => SECRET.test(k) && !ALLOWED.has(k))).toEqual([]);
    expect(res.body).not.toMatch(/secret|سر|\+20/);
  });

  it('marks only her own students `mine` (docs/16 row 37): another salesperson reads the same lessons without it', async () => {
    const res = await t.get('/sales/schedule?date=2026-10-11', 'salesB');
    expect(res.json().lessons[0].students).toEqual([{ id: 's1', code: 'AB-0101', name: 'ياسمين' }]);
  });

  it('without a date it reads today; a bad date or teacher id is 400', async () => {
    const res = await t.get('/sales/schedule', 'salesA');
    expect(res.json().date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((await t.get('/sales/schedule?date=11-10-2026', 'salesA')).statusCode).toBe(400);
    expect((await t.get('/sales/schedule?teacherId=nope', 'salesA')).statusCode).toBe(400);
  });
});
