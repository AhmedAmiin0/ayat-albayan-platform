import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  academyApp,
  bundle,
  SUB,
  teacherRow,
} from '@/modules/sales/sales/academy/sales-academy.fakes';
import { SalesAcademyController } from '@/modules/sales/sales/academy/sales-academy.controller';

type App = Awaited<ReturnType<typeof academyApp>>;
const INVALID = expect.objectContaining({ code: 'response_invalid' });

describe('/sales/teachers and the history served from their route objects', () => {
  let t: App;
  beforeAll(async () => {
    t = await academyApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.academy.teachers.mockResolvedValue([teacherRow()]);
    t.history.history.mockResolvedValue(bundle());
  });

  it('a teacher the schema refuses is a 500 response_invalid, never sent', async () => {
    t.academy.teachers.mockResolvedValue([Object.assign(teacherRow(), { gender: 'x' })]);
    const res = await t.get('/sales/teachers', 'salesA');
    expect([res.statusCode, res.json()]).toEqual([500, INVALID]);
  });

  it('no active teacher answers an empty list', async () => {
    t.academy.teachers.mockResolvedValue([]);
    const res = await t.get('/sales/teachers', 'salesA');
    expect([res.statusCode, res.json()]).toEqual([200, []]);
  });

  it('a payment of an unknown kind is a 500 response_invalid, never sent', async () => {
    const b = bundle();
    t.history.history.mockResolvedValue({
      ...b,
      payments: b.payments.map((p) => ({ ...p, kind: 'gift' as typeof p.kind })),
    });
    const res = await t.get(`/sales/subscriptions/${SUB}/history`, 'salesA');
    expect([res.statusCode, res.json()]).toEqual([500, INVALID]);
  });

  it('a bad subscription id is a 400 before anything is read', async () => {
    const res = await t.get('/sales/subscriptions/nope/history', 'salesA');
    expect(res.statusCode).toBe(400);
    expect(t.history.studentOf).not.toHaveBeenCalled();
  });
});

describe('SalesAcademyController tags', () => {
  it('carries no class tag: each handler takes its tag from its route object', () => {
    const { prototype } = SalesAcademyController;
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, SalesAcademyController)).toBeUndefined();
    const { history, teachers, day, live, students } = prototype;
    for (const handler of [history, teachers, day, live, students]) {
      expect(Reflect.getMetadata(DECORATORS.API_TAGS, handler)).toEqual(['sales']);
    }
  });
});
