import type { Json } from '@ab/db';
import { monthStart, payoutStatuses, type PayoutGenerateResult } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { toPayoutView } from './payouts.mapper';
import { monthWindow, planPayout, type PayoutAction } from './payouts.plan';
import { PayoutsQueries, type PayoutRow } from './payouts.queries';
import { PayoutsSettings } from './payouts.settings';

type Ctx = { teacherId: string; month: string; actorId: string };

/**
 * Y2 «احسب مستحقات الشهر» (R-PAY-02, R-TCH-04, issue E3): per teacher, the paid lessons in the
 * month (teacher's tz) × the rate for their duration, EGP, written as a draft. Approved and paid
 * rows are never touched; re-running gives the same rows (idempotent).
 */
@Injectable()
export class PayoutsGenerator {
  constructor(
    private readonly payouts: PayoutsQueries,
    private readonly settings: PayoutsSettings,
    private readonly audit: AuditService,
  ) {}

  async generate(month: string, actorId: string): Promise<PayoutGenerateResult> {
    const s = await this.settings.read();
    const statuses = payoutStatuses({ countLate: s.payout_count_late, countNoShow: s.payout_count_no_show });
    const first = monthStart(month);
    const existing = new Map((await this.payouts.forMonth(first)).map((r) => [r.teacher_id, r]));
    const missing: PayoutGenerateResult['missing_rates'] = [];
    for (const teacher of await this.payouts.teachers()) {
      const window = monthWindow(month, teacher.tz);
      const lessons = await this.payouts.lessons({ teacherId: teacher.id, ...window });
      const action = planPayout({ teacher, lessons, existing: existing.get(teacher.id), statuses });
      if (action.kind === 'missing')
        missing.push({ teacher_id: teacher.id, display_name_ar: teacher.display_name_ar, durations: action.durations });
      await this.apply(action, { teacherId: teacher.id, month: first, actorId });
    }
    const payouts = (await this.payouts.forMonth(first)).map(toPayoutView);
    return { month, payouts, missing_rates: missing };
  }

  private async apply(action: PayoutAction, ctx: Ctx): Promise<void> {
    if (action.kind === 'frozen') return;
    if (action.kind !== 'draft') {
      if (action.deleteId) await this.payouts.removeDraft(action.deleteId);
      return;
    }
    const values = {
      lessons_count: action.lessonsCount,
      amount: action.amount,
      breakdown: action.breakdown as unknown as NonNullable<Json>,
    };
    const row: PayoutRow | null = action.id
      ? await this.payouts.update(action.id, { ...values, from: 'draft' })
      : await this.payouts.insert({ ...values, teacher_id: ctx.teacherId, month: ctx.month, created_by: ctx.actorId });
    if (!row) return; // approved meanwhile: frozen
    await this.audit.record({
      actorId: ctx.actorId,
      entity: 'teacher_payouts',
      entityId: row.id,
      action: 'generate',
      after: values,
    });
  }
}
