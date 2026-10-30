import { expect, test } from '@playwright/test';
import type { BookingResult } from '@ab/shared';
import { call, family, freshPhone, leadOf, makeAssistant, trialBody, type Assistant } from '../../support/sales/assistant-api';
import { seedLead, setSetting } from '../../support/core/messages';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, setAvailability, withSql } from '../../support/core/schedule';

// settings.sales_auto_assign OFF (owner 2026-10-12, docs/16 row 13), through the REAL API and database:
// a salesperson registers from any chat, a lead of another salesperson or of nobody (new leads stay
// unassigned while OFF); she is still the one who brought the student, and leads.assigned_to stays as it
// was. The trial-only rules still hold. ON (the seeded default) is covered by assistant-money.api.spec.ts
// and is restored after this file.

const need = <T>(v: T | undefined): T => {
  if (v === undefined) throw new Error('an earlier step did not run');
  return v;
};

test.describe.serial('sales auto-assign OFF: registration without the ownership check (API + DB)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  let teacher = '';
  let a: Assistant | undefined;
  let c: Assistant | undefined;

  test.beforeAll(async () => {
    teacher = await resetAbrar();
    await setAvailability(teacher, [[6, '08:00', '22:00']]);
    a = await makeAssistant('offa');
    c = await makeAssistant('offc');
    await setSetting('sales_auto_assign', false); // last: a failed setup never leaves the switch OFF
  });
  test.afterAll(() => setSetting('sales_auto_assign', true));

  const facts = (student: string, lead: string) =>
    withSql(async (sql) => {
      const [s] = await sql<{ brought_by: string | null }[]>`select brought_by from public.students where id = ${student}`;
      const [l] = await sql<{ assigned_to: string | null }[]>`select assigned_to from public.leads where id = ${lead}`;
      return { broughtBy: s?.brought_by, assignedTo: l?.assigned_to };
    });

  test('A registers a student from a lead assigned to C: 201, credited to A, the lead stays assigned to C', async ({ request }) => {
    const me = need(a);
    const phone = freshPhone();
    const lead = await leadOf(need(c).id, phone);
    const res = await call<BookingResult>(request, { token: me.token, method: 'POST', path: '/sales/booking', body: trialBody({ teacherId: teacher, leadId: lead, phone, name: 'سارة', time: '17:00' }) });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(await facts(need(res.body.student_ids[0]), lead)).toEqual({ broughtBy: me.id, assignedTo: need(c).id });
  });

  test('A registers a student from an unassigned lead (the normal case while OFF): 201, credited to A, still unassigned', async ({ request }) => {
    const me = need(a);
    const phone = freshPhone();
    const lead = await seedLead({ phone });
    const res = await call<BookingResult>(request, { token: me.token, method: 'POST', path: '/sales/booking', body: trialBody({ teacherId: teacher, leadId: lead, phone, name: 'ريم', time: '18:00' }) });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(await facts(need(res.body.student_ids[0]), lead)).toEqual({ broughtBy: me.id, assignedTo: null });
  });

  test('the wizard reads may name a student brought by C: teachers and slots answer 200 to A', async ({ request }) => {
    const theirs = await family(need(c).id, 'لمى');
    const token = need(a).token;
    const day = nextWeekSaturday();
    const range = `from=${riyadh(day, '00:00').toISOString()}&to=${riyadh(addDays(day, 1), '00:00').toISOString()}`;
    const teachers = await call(request, { token, method: 'GET', path: `/sales/booking/teachers?studentId=${theirs.student}` });
    const slots = await call(request, { token, method: 'GET', path: `/sales/booking/slots?teacherId=${teacher}&${range}&durationMin=30&studentIds=${theirs.student}` });
    expect([teachers.status, slots.status]).toEqual([200, 200]);
  });

  test('a package from a lead is not a course of her student (403 course_one_student), nothing booked', async ({ request }) => {
    const phone = freshPhone();
    const lead = await seedLead({ phone });
    const body = { ...trialBody({ teacherId: teacher, leadId: lead, phone, name: 'هند', time: '19:00' }), package: '8' };
    const res = await call(request, { token: need(a).token, method: 'POST', path: '/sales/booking', body });
    expect([res.status, res.body]).toMatchObject([403, { code: 'course_one_student' }]);
    const [row] = await withSql((sql) => sql<{ n: number }[]>`select count(*)::int as n from public.students s join public.guardians g on g.id = s.guardian_id where g.phone_e164 = ${phone}`);
    expect(row?.n).toBe(0);
  });
});
