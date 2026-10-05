import { formatAmount } from '@ab/shared';
import { freshDigits, seedLead } from './messages';
import { riyadhToday, thisMonthStart } from './money-extra';
import { seedPackageStudent } from './money';
import { addDays, riyadh, seedLesson, withSql } from './schedule';

// Seed + helpers for the dashboard and exports specs (A8): leads in three statuses from one source,
// a paid package (revenue), a second package still unpaid, two lessons with outcomes today, one expense.

/** The Riyadh week (Saturday → Friday) holding `today`, like the dashboard's «هذا الأسبوع». */
export function weekOf(today = riyadhToday()): { from: string; to: string } {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 6 = Saturday
  const from = addDays(today, -((dow + 1) % 7));
  return { from, to: addDays(from, 6) };
}

/** The dashboard's money text: whole units, Western digits, «-» for a negative. */
export function money(n: number): string {
  const r = Math.round(n);
  return r < 0 ? `-${formatAmount(-r)}` : formatAmount(r);
}

export interface DashboardSeed {
  price: number;
  expense: number;
  studentId: string;
  guardianId: string;
}

/** Everything A8 counts, all from the `referral` source; call after resetAbrar(). */
export async function seedDashboard(teacherId: string): Promise<DashboardSeed> {
  const base = Number(freshDigits());
  for (const [i, status] of (['new', 'trial_booked', 'converted'] as const).entries()) {
    await seedLead({ phone: `+${base + i}`, name: `e2e-dash-${i}`, status, source: 'referral' });
  }
  const paid = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم لوحة', student: 'لوحة' });
  const unpaid = await seedPackageStudent({ teacherId, paid: false, guardian: 'أم عداد', student: 'عداد' });
  const today = riyadhToday();
  for (const [hour, status] of [['12:00', 'confirmed'], ['13:00', 'no_show']] as const) {
    const id = await seedLesson({ teacherId, studentId: paid.studentId, startsAt: riyadh(today, hour), minutes: 45 });
    await withSql((sql) => sql`update public.lessons set status = ${status} where id = ${id}`);
  }
  const expense = 120;
  await withSql(async (sql) => {
    await sql`update public.guardians set source = 'referral' where id in (${paid.guardianId}, ${unpaid.guardianId})`;
    await sql`delete from public.expenses where month = ${thisMonthStart()}`;
    await sql`insert into public.expenses (month, category, amount, currency)
      values (${thisMonthStart()}, 'tools', ${expense}, 'SAR')`;
  });
  return { price: paid.price, expense, studentId: paid.studentId, guardianId: paid.guardianId };
}

/** Rows the KPI strip counts straight from SQL (unpaid packages, open admin tasks). */
export async function kpiCounts(): Promise<{ unpaid: number; tasks: number }> {
  return withSql(async (sql) => {
    const [u] = await sql<{ n: number }[]>`select count(*)::int as n from public.subscriptions where status = 'unpaid'`;
    const [t] = await sql<{ n: number }[]>`select count(*)::int as n from public.admin_tasks where done_at is null`;
    return { unpaid: u?.n ?? -1, tasks: t?.n ?? -1 };
  });
}

export async function removeDashboardExpense(): Promise<void> {
  await withSql((sql) => sql`delete from public.expenses where month = ${thisMonthStart()}`);
}
