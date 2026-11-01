import { canTransitionPayout, monthStart, type PayoutView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { conflict, notFound } from '@/common/http/errors';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { toPayoutView } from './payouts.mapper';
import { approveBlock, monthWindow } from './payouts.plan';
import { PayoutsQueries, type PayoutRow } from './payouts.queries';

/** Y1, Y3, Y5: list a month, approve (draft → approved), a teacher's own. Pay / un-pay / reopen: PayoutsLedger. */
@Injectable()
export class PayoutsService {
  constructor(
    private readonly payouts: PayoutsQueries,
    private readonly teachers: TeachersRepo,
    private readonly audit: AuditService,
  ) {}

  async month(month: string): Promise<PayoutView[]> {
    return (await this.payouts.forMonth(monthStart(month))).map(toPayoutView);
  }

  /** Y3: only once the month is over in the teacher's tz and its reports are in (409 otherwise). */
  async approve(id: string, actorId: string): Promise<PayoutView> {
    const before = await this.row(id);
    if (before.status === 'draft') {
      const window = monthWindow(before.month.slice(0, 7), before.teacher?.tz ?? 'UTC');
      const pendingReports = await this.payouts.pendingReports({ teacherId: before.teacher_id, ...window });
      const editedSince = await this.payouts.editedSince({ teacherId: before.teacher_id, ...window, since: before.updated_at });
      const block = approveBlock({ monthEnd: window.to, now: new Date(), pendingReports, editedSince });
      if (block) throw conflict(block, block === 'reports_pending' ? { count: pendingReports } : {});
    }
    const now = new Date().toISOString();
    return this.move({ before, actorId, to: 'approved', write: { approved_at: now, approved_by: actorId } });
  }

  /** Y5: the signed-in teacher's rows, newest month first. */
  async mine(profileId: string, month?: string): Promise<PayoutView[]> {
    const teacherId = await this.teachers.idByProfile(profileId);
    if (!teacherId) throw notFound('teacher_not_linked');
    return (await this.payouts.forTeacher(teacherId, month ? monthStart(month) : undefined)).map(toPayoutView);
  }

  private async row(id: string): Promise<PayoutRow> {
    const row = await this.payouts.get(id);
    if (!row) throw notFound('payout_not_found');
    return row;
  }

  private async move(input: {
    before: PayoutRow;
    actorId: string;
    to: 'approved';
    write: Record<string, string>;
  }): Promise<PayoutView> {
    const { before } = input;
    if (!canTransitionPayout(before.status, input.to)) throw conflict('invalid_transition', { from: before.status });
    const after = await this.payouts.update(before.id, { ...input.write, status: input.to, from: before.status });
    if (!after) throw conflict('invalid_transition');
    await this.audit.record({
      actorId: input.actorId,
      entity: 'teacher_payouts',
      entityId: before.id,
      action: 'approve',
      before: { status: before.status },
      after: { status: after.status, ...input.write },
    });
    return toPayoutView(after);
  }
}
