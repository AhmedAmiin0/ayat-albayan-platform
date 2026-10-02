// subscriptions + payments from invented HEART / FIN rows (E1, E2).
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { bundleOf, pipeline, row, studentRow } from '../../sources/sheets/fixtures.ts';
import type { Cell, SourceRow } from '../../types.ts';
import { guardiansModule } from '../people/guardians.ts';
import { studentsModule } from '../people/students.ts';
import { teachersModule } from '../teachers/teachers.ts';
import { paymentsModule, subscriptionsModule } from './subscriptions.ts';

const MODULES = [
  teachersModule,
  guardiansModule,
  studentsModule,
  subscriptionsModule,
  paymentsModule,
];
const heart = (fields: Record<string, Cell>) =>
  row(
    {
      name: 'Reem',
      phone: 966551110001,
      date: '2026-09-05',
      lessons_used: 3,
      paid_status: 'Paid',
      lessons_remaining: 5,
      teacher: 'Abrar',
      ...fields,
    },
    { source: 'HEART', tab: 'subscription' },
  );
const fin = (desc: string, amount: number) =>
  row({ revenue_desc: desc, revenue_amount: amount }, { source: 'FIN', tab: 'sept' });
const run = (h: SourceRow[], f: SourceRow[] = [fin('Reem Ahmed', 1343)]) =>
  pipeline(
    bundleOf({
      hub_students: [studentRow({ student_name: 'ريم وجنى' })],
      heart_subscriptions: h,
      fin_sept: f,
    }),
    MODULES,
  );
const REEM = keys.student({ guardianPhone: '+966551110001', name: 'ريم' });

describe('subscriptions', () => {
  it('Latin name → sibling by skeleton; total = used + remaining; price from FIN', () => {
    const r = run([heart({})]);
    const [s] = r.by('subscriptions');
    expect(s?.key).toEqual(keys.subscription({ student: REEM.key, startsOn: '2026-09-05' }));
    expect(s?.record).toEqual({
      columns: {
        package: '8',
        duration: 45,
        lessons_total: 8,
        price: 1343,
        currency: 'EGP',
        price_source: {
          source: 'import',
          heart_row: s?.ref.row,
          fin: { tab: 'sept', row: expect.any(Number) },
        },
        starts_on: '2026-09-05',
        status: 'active',
      },
      refs: { student_id: REEM },
    });
    expect(r.by('payments')).toMatchObject([
      {
        key: keys.payment({ subscription: s?.key.key ?? '', paidOn: '2026-09-05', amount: 1343 }),
        record: {
          columns: {
            amount: 1343,
            currency: 'EGP',
            method: 'other',
            paid_at: '2026-09-05T09:00:00.000Z',
          },
        },
      },
    ]);
  });

  it('unpaid / used up statuses; an odd total has no package', () => {
    const r = run([
      heart({ paid_status: 'Not paid' }),
      heart({ name: 'Jana', lessons_used: 7, lessons_remaining: 0 }),
    ]);
    expect(
      r.by('subscriptions').map((d) => [d.record.columns['status'], d.record.columns['package']]),
    ).toEqual([
      ['unpaid', '8'],
      ['expired', null],
    ]);
    expect(r.by('payments')).toEqual([]);
  });

  it('no price: 0 + review, and no payment for a «Paid» row without an amount', () => {
    const r = run([heart({})], [fin('Reem + Jana', 2686)]);
    expect(r.by('subscriptions')[0]?.record.columns['price']).toBe(0);
    expect(r.by('payments')).toEqual([]);
    expect(r.issues.filter((i) => i.entity === 'subscriptions')).toMatchObject([
      { code: 'missing_field', severity: 'review', field: 'price' },
    ]);
  });

  it('rejects rows without phone, student, date or lessons; warns on a teacher mismatch', () => {
    const r = run([
      heart({ phone: null }),
      heart({ name: 'Salma' }),
      heart({ date: null }),
      heart({ lessons_used: 0, lessons_remaining: 0 }),
      heart({ teacher: 'Hend' }),
    ]);
    const own = r.issues.filter((i) => i.entity === 'subscriptions');
    expect(own.map((i) => [i.code, i.field])).toEqual([
      ['bad_phone', 'phone'],
      ['missing_ref', 'student'],
      ['missing_field', 'date'],
      ['missing_field', 'lessons'],
      ['conflict', 'teacher'],
    ]);
    // Two children on the phone and the Latin name fits neither: review with both, not reject.
    expect(own[1]).toMatchObject({ severity: 'review', detail: 'ambiguous: one of «ريم», «جنى»' });
  });
});
