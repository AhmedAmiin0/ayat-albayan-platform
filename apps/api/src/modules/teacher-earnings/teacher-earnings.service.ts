import {
  allocateOldestFirst,
  type SignedDownload,
  type SignedUpload,
  type TeacherEarningsView,
  type TeacherPaymentCreate,
  type TeacherPaymentView,
  type TeacherReceiptUpload,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { BUCKETS, isPathOf, teacherReceiptPath } from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { badRequest, conflict, notFound } from '../scheduling/errors';
import { TeachersQueries } from '../teachers/teachers.queries';
import { toEarningsView, toPaymentView } from './teacher-earnings.mapper';
import { TeacherEarningsQueries, type PaymentRow, type TeacherRef } from './teacher-earnings.queries';

/**
 * Per-session teacher earnings (docs/11 §8b). Admin: a teacher's balance and sessions, record a
 * payment against chosen sessions (oldest first, partial allowed, idempotent), receipts. Teacher:
 * her own balance, sessions and payments only. The ledger rows themselves are written by the
 * database (migration 177); money is recorded by one RPC (migration 178).
 */
@Injectable()
export class TeacherEarningsService {
  constructor(
    private readonly queries: TeacherEarningsQueries,
    private readonly teachers: TeachersQueries,
    private readonly storage: StorageService,
  ) {}

  async view(teacherId: string): Promise<TeacherEarningsView> {
    const teacher = await this.teacher(teacherId);
    return toEarningsView(teacher, await this.queries.earnings(teacher.id));
  }

  async payments(teacherId: string): Promise<TeacherPaymentView[]> {
    return (await this.queries.payments((await this.teacher(teacherId)).id)).map(toPaymentView);
  }

  /** The signed-in teacher's own balance (404 `teacher_not_linked` when the login has no teacher). */
  async mine(profileId: string): Promise<TeacherEarningsView> {
    return this.view(await this.ownId(profileId));
  }

  async minePayments(profileId: string): Promise<TeacherPaymentView[]> {
    return this.payments(await this.ownId(profileId));
  }

  /**
   * Spreads the amount over the ticked sessions (or every open one) oldest first. A retry of the
   * same form (clientRequestId) returns the payment already recorded. 400 `over_payment` /
   * `nothing_due` / `receipt_path`; 409 `over_payment` when a concurrent payment took the room.
   */
  async pay(teacherId: string, input: TeacherPaymentCreate, actorId: string): Promise<TeacherPaymentView> {
    const teacher = await this.teacher(teacherId);
    const replay = await this.replayOf(teacher, input.clientRequestId);
    if (replay) return replay;
    if (input.receiptPath) await this.checkReceipt(teacher.id, input.receiptPath);
    const rows = await this.queries.earnings(teacher.id);
    const chosen = input.earningIds ? this.pick(rows, input.earningIds) : rows;
    const plan = allocateOldestFirst({
      amount: input.amount,
      earnings: chosen.map((r) => ({ id: r.id ?? '', starts_at: r.starts_at ?? '', outstanding: Number(r.outstanding ?? 0) })),
    });
    if (!plan.ok) throw badRequest(plan.error);
    const { payment_id: id } = await this.queries.record({
      actor: actorId,
      teacher_id: teacher.id,
      amount: input.amount,
      method: input.method,
      paid_at: input.paidAt,
      receipt_path: input.receiptPath ?? null,
      note: input.note ?? null,
      client_request_id: input.clientRequestId,
      items: plan.items,
    });
    return this.one(id);
  }

  /** Signed upload for receipts/{teacher_id}/{uuid}.{ext}. */
  async uploadUrl(teacherId: string, input: TeacherReceiptUpload): Promise<SignedUpload> {
    const teacher = await this.teacher(teacherId);
    return this.storage.signedUpload({ bucket: BUCKETS.receipts, path: teacherReceiptPath({ teacherId: teacher.id, mime: input.mime }) });
  }

  async receipt(teacherId: string, paymentId: string): Promise<SignedDownload> {
    const row = await this.queries.payment(paymentId);
    if (!row || row.teacher_id !== teacherId || !row.receipt_path) throw notFound('receipt_not_found');
    return this.storage.signedDownload({ bucket: BUCKETS.receipts, path: row.receipt_path });
  }

  private pick<T extends { id: string | null }>(rows: readonly T[], ids: readonly string[]): T[] {
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id) ?? this.missing());
  }

  private missing(): never {
    throw notFound('earning_not_found');
  }

  private async checkReceipt(teacherId: string, path: string): Promise<void> {
    const ok = isPathOf(path, teacherId) && (await this.storage.exists({ bucket: BUCKETS.receipts, path }));
    if (!ok) throw badRequest('receipt_path');
  }

  private async replayOf(teacher: TeacherRef, requestId: string): Promise<TeacherPaymentView | null> {
    const row: PaymentRow | null = await this.queries.byRequest(requestId);
    if (!row) return null;
    if (row.teacher_id !== teacher.id) throw conflict('client_request_reused');
    return toPaymentView(row);
  }

  private async one(id: string): Promise<TeacherPaymentView> {
    const row = await this.queries.payment(id);
    if (!row) throw notFound('payment_not_found');
    return toPaymentView(row);
  }

  private async teacher(id: string): Promise<TeacherRef> {
    const t = await this.queries.teacher(id);
    if (!t) throw notFound('teacher_not_found');
    return t;
  }

  private async ownId(profileId: string): Promise<string> {
    const id = await this.teachers.idByProfile(profileId);
    if (!id) throw notFound('teacher_not_linked');
    return id;
  }
}
