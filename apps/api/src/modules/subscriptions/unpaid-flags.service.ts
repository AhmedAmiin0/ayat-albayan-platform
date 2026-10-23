import { Injectable } from '@nestjs/common';
import { BalanceQueries } from './balance.queries';
import { unpaidFlagged } from './packages.plan';
import { SubscriptionsQueries } from './subscriptions.queries';
import { SubscriptionsSettings } from './subscriptions.settings';

/**
 * R-SUB-02 «flag future lessons when unpaid»: which of these students have their newest package
 * unpaid with nothing left. The lesson views mark those students' future open lessons
 * (subscriptions.unpaidFlag); nothing is stored and nothing is cancelled. Empty when the setting
 * flag_future_lessons_when_unpaid is off.
 */
@Injectable()
export class UnpaidFlags {
  constructor(
    private readonly subs: SubscriptionsQueries,
    private readonly balances: BalanceQueries,
    private readonly settings: SubscriptionsSettings,
  ) {}

  async studentIds(studentIds: readonly string[]): Promise<Set<string>> {
    const ids = [...new Set(studentIds)];
    if (ids.length === 0) return new Set();
    if (!(await this.settings.read()).flag_future_lessons_when_unpaid) return new Set();
    const [rows, balances] = await Promise.all([this.subs.forStudents(ids), this.balances.forStudents(ids)]);
    const byId = new Map(balances.map((b) => [b.subscription_id, b]));
    return new Set(
      ids.filter((id) => unpaidFlagged({ subs: rows.filter((r) => r.student_id === id), balances: byId })),
    );
  }
}
