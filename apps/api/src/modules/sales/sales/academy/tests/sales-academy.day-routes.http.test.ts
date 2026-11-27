import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  academyApp,
  liveRow,
  scheduleRow,
} from '@/modules/sales/sales/academy/sales-academy.fakes';

type App = Awaited<ReturnType<typeof academyApp>>;
const UNKNOWN = { status: 'lost' };

describe('/sales/schedule and /sales/live served from their route objects', () => {
  let t: App;
  beforeAll(async () => {
    t = await academyApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.schedule.day.mockResolvedValue([scheduleRow()]);
    t.academy.live.mockResolvedValue([liveRow()]);
  });

  it('a day lesson the schema refuses is a 500 response_invalid, never sent', async () => {
    t.schedule.day.mockResolvedValue([Object.assign(scheduleRow(), UNKNOWN)]);
    const res = await t.get('/sales/schedule?date=2026-10-11', 'salesA');
    expect([res.statusCode, res.json()]).toEqual([
      500,
      expect.objectContaining({ code: 'response_invalid' }),
    ]);
  });

  it('a running lesson the schema refuses is a 500 response_invalid, never sent', async () => {
    t.academy.live.mockResolvedValue([Object.assign(liveRow(), UNKNOWN)]);
    const res = await t.get('/sales/live', 'salesA');
    expect([res.statusCode, res.json()]).toEqual([
      500,
      expect.objectContaining({ code: 'response_invalid' }),
    ]);
  });

  it('a day without lessons answers the day and an empty list', async () => {
    t.schedule.day.mockResolvedValue([]);
    const res = await t.get('/sales/schedule?date=2026-10-11', 'salesA');
    expect([res.statusCode, res.json()]).toEqual([200, { date: '2026-10-11', lessons: [] }]);
  });

  it('a bad teacher id is a 400 before anything is read', async () => {
    const res = await t.get('/sales/schedule?teacherId=nope', 'salesA');
    expect(res.statusCode).toBe(400);
    expect(t.schedule.day).not.toHaveBeenCalled();
  });
});
