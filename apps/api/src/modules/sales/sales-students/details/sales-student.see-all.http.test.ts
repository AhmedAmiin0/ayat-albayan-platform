import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SUB } from '@/modules/sales/sales/academy/sales-academy.fakes';
import { MINE, REPORT, studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const PRICE = [{ id: SUB, price: 400, currency: 'SAR' }];

// Owner 2026-10-30, «Make all assistants see all»: salesB reads salesA's student as salesA does.
describe('every assistant sees every student (GET /sales/students/:id, its attendance and report PDF)', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    t.queries.prices.mockResolvedValue(PRICE);
  });

  it('salesB: the subscriptions with «مدفوعة جزئيًا» (paid, price, currency), as salesA', async () => {
    const other = (await t.call('GET', `/sales/students/${MINE}`, { token: 'salesB' })).json();
    const hers = (await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' })).json();
    const current = other.subscriptions.find((s: { id: string }) => s.id === other.current_id);
    expect(current.part_paid).toEqual({ paid: 290, price: 400, due: 110, currency: 'SAR' });
    expect(other.subscriptions).toEqual(hers.subscriptions);
    expect(other.reports).toEqual(hers.reports);
    expect([other.mine, hers.mine]).toEqual([false, true]);
  });

  it('salesB: «سجل الحضور» lets a sent report open; its PDF is signed', async () => {
    const table = await t.call('GET', `/sales/students/${MINE}/attendance`, { token: 'salesB' });
    expect(table.statusCode).toBe(200);
    expect(table.json().mine).toBe(false);
    const sent = table.json().items.filter((r: { report_sent: boolean }) => r.report_sent);
    expect(sent.every((r: { report_id: string | null }) => r.report_id !== null)).toBe(true);
    const pdf = await t.call('GET', `/sales/students/${MINE}/reports/${REPORT}/pdf`, { token: 'salesB' });
    expect(pdf.json().url).toBe('https://storage/signed');
  });

  it('admin, teacher and the classroom assistant: still 403 on the sales routes', async () => {
    for (const token of ['admin', 'teacher', 'assistant'] as const) {
      const pdf = await t.call('GET', `/sales/students/${MINE}/reports/${REPORT}/pdf`, { token });
      expect(pdf.statusCode).toBe(403);
    }
    expect(t.files.studentPdfUrl).not.toHaveBeenCalled();
  });
});
