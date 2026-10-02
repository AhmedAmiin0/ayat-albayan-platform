import { canTransitionPayout, monthStart, type PayoutPay, type PayoutView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { conflict, notFound } from '../scheduling/errors';
import { TeachersQueries } from '../teachers/teachers.queries';
import { toPayoutView } from './payouts.mapper';
import { PayoutsQueries } from './payouts.queries';

/** Y1, Y3, Y4, Y5: list a month, approve, mark paid (draft → approved → paid), a teacher's own. */
@Injectable()
export class PayoutsService {
  constructor(
    private readonly payouts: PayoutsQueries,
    private readonly teachers: TeachersQueries,
    private readonly audit: AuditService,
  ) {}

  async month(month: string): Promise<PayoutView[]> {
    return (await this.payouts.forMonth(monthStart(month))).map(toPayoutView);
  }

  async approve(id: string, actorId: string): Promise<PayoutView> {
    const now = new Date().toISOString();
    return this.move({ id, actorId, to: 'approved', write: { approved_at: now, approved_by: actorId } });
  }

  async pay(id: string, body: PayoutPay, actorId: string): Promise<PayoutView> {
    const paidAt = body.paidAt ?? new Date().toISOString();
    return this.move({ id, actorId, to: 'paid', write: { paid_at: paidAt, paid_by: actorId } });
  }

  /** Y5: the signed-in teacher's rows, newest month first. */
  async mine(profileId: string, month?: string): Promise<PayoutView[]> {
    const teacherId = await this.teachers.idByProfile(profileId);
    if (!teacherId) throw notFound('teacher_not_linked');
    return (await this.payouts.forTeacher(teacherId, month ? monthStart(month) : undefined)).map(toPayoutView);
  }

  private async move(input: {
    id: string;
    actorId: string;
    to: 'approved' | 'paid';
    write: Record<string, string>;
  }): Promise<PayoutView> {
    const before = await this.payouts.get(input.id);
    if (!before) throw notFound('payout_not_found');
    if (!canTransitionPayout(before.status, input.to)) throw conflict('invalid_transition', { from: before.status });
    const after = await this.payouts.update(input.id, { ...input.write, status: input.to, from: before.status });
    if (!after) throw conflict('invalid_transition');
    await this.audit.record({
      actorId: input.actorId,
      entity: 'teacher_payouts',
      entityId: input.id,
      action: input.to === 'approved' ? 'approve' : 'pay',
      before: { status: before.status },
      after: { status: after.status, ...input.write },
    });
    return toPayoutView(after);
  }
}
