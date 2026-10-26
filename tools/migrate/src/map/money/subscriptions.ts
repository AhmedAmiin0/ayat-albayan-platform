// subscriptions + payments ← HEART «subscription» (+ FIN revenue for the amount). lessons_total =
// Lectures (used) + Sub (remaining); the balance itself is derived in the app from completed
// lessons (v_subscription_balance), never copied. A «Paid» row becomes a payment only when FIN
// gives its amount; duration is not in HEART, so 45 min (the academy default) is assumed.
import type { EntityModule, SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { accepted, issueOnly } from '../../sources/sheets/issues.ts';
import { zonedToUtc } from '../../time.ts';
import type { Mapped } from '../../types.ts';
import { SHEET_TZ } from '../schedule/bookings.ts';
import { type HeartSub, heartSubs, packageOf } from './heart.ts';

/** FIN amounts are EGP (income statement currency). */
const IMPORT_CURRENCY = 'EGP';

const isSub = (r: ReturnType<typeof heartSubs>[number]): r is HeartSub => 'key' in r;

function status(s: HeartSub): string {
  if (!s.paid) return 'unpaid';
  return s.remaining > 0 ? 'active' : 'expired';
}

function mapSubscriptions(bundle: SourceBundle): Mapped[] {
  return heartSubs(bundle).flatMap((s) =>
    isSub(s)
      ? [
          accepted({
            key: s.key,
            ref: s.ref,
            issues: s.issues,
            columns: {
              package: packageOf(s.total),
              duration: 45,
              lessons_total: s.total,
              price: s.price?.amount ?? 0,
              currency: IMPORT_CURRENCY,
              price_source: {
                source: 'import',
                heart_row: s.ref.row,
                fin: s.price ? { tab: s.price.fin.tab, row: s.price.fin.row } : null,
              },
              starts_on: s.startsOn,
              status: status(s),
            },
            refs: { student_id: s.student },
          }),
        ]
      : issueOnly(s.issues),
  );
}

function mapPayments(bundle: SourceBundle): Mapped[] {
  return heartSubs(bundle).flatMap((s): Mapped[] => {
    if (!isSub(s) || !s.paid || !s.price) return [];
    const amount = s.price.amount;
    return [
      accepted({
        key: keys.payment({ subscription: s.key.key, paidOn: s.startsOn, amount }),
        ref: s.ref,
        columns: {
          amount,
          currency: IMPORT_CURRENCY,
          method: 'other', // not recorded in the sheets (E2)
          paid_at: zonedToUtc({ date: s.startsOn, time: '12:00', tz: SHEET_TZ }).toISOString(),
        },
        refs: { subscription_id: s.key },
      }),
    ];
  });
}

export const subscriptionsModule: EntityModule = {
  entity: 'subscriptions',
  table: 'subscriptions',
  map: mapSubscriptions,
};

export const paymentsModule: EntityModule = {
  entity: 'payments',
  table: 'payments',
  map: mapPayments,
};
