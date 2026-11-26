import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { ReportHistoryQueries } from '@/modules/reporting/reports/history/report-history.queries';

const ids = Array.from({ length: 150 }, (_, i) => `l${i}`);
const lesson = (id: string) => ({ id, starts_at: '2026-01-01T00:00:00Z', teacher: null });

describe('ReportHistoryQueries.lessons', () => {
  it('reads the ids in chunks of 100 and joins the rows in chunk order', async () => {
    const t = fakeDb({ lessons: [{ data: [lesson('l0')] }, { data: [lesson('l100')] }] });
    const rows = await new ReportHistoryQueries(t.db).lessons(ids);
    expect(rows.map((r) => r.id)).toEqual(['l0', 'l100']);
    const chunks = t.calls.filter((c) => c.method === 'in').map((c) => c.args[1]);
    expect(chunks).toEqual([ids.slice(0, 100), ids.slice(100)]);
  });

  it('makes no request for no ids', async () => {
    const t = fakeDb({});
    expect(await new ReportHistoryQueries(t.db).lessons([])).toEqual([]);
    expect(t.trips).toEqual([]);
  });

  it('answers a failed chunk as 500 naming the code', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new ReportHistoryQueries(db).lessons(ids))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
