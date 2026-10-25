import type { Tables, TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../../common/http/http';

/** A path already held by a payment: one of its «المرفقات», or its single receipt. */
export type PathOwner = { path: string; paymentId: string };
export type PaymentAttachmentRow = Pick<Tables<'payment_attachments'>, 'id' | 'path' | 'mime' | 'size' | 'created_at'>;

/** All supabase access for `payment_attachments` (service role; the API is the only writer), plus who holds a path. */
@Injectable()
export class PaymentAttachmentsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The payment's files, oldest first. */
  async forPayment(paymentId: string): Promise<PaymentAttachmentRow[]> {
    const { data, error } = await this.db
      .from('payment_attachments')
      .select('id, path, mime, size, created_at')
      .eq('payment_id', paymentId)
      .order('created_at')
      .order('id');
    if (error) throw dbError(error);
    return data;
  }

  /** Who already holds these paths (an attachment row or a payments.receipt_path): one file, one payment. */
  async owners(paths: readonly string[]): Promise<PathOwner[]> {
    if (paths.length === 0) return [];
    const [files, receipts] = await Promise.all([
      this.db.from('payment_attachments').select('path, payment_id').in('path', [...paths]),
      this.db.from('payments').select('id, receipt_path').in('receipt_path', [...paths]),
    ]);
    if (files.error) throw dbError(files.error);
    if (receipts.error) throw dbError(receipts.error);
    return [
      ...files.data.map((r) => ({ path: r.path, paymentId: r.payment_id })),
      ...receipts.data.flatMap((r) => (r.receipt_path ? [{ path: r.receipt_path, paymentId: r.id }] : [])),
    ];
  }

  /** Idempotent on the unique path: a replayed form never duplicates a row. */
  async save(rows: readonly TablesInsert<'payment_attachments'>[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.db
      .from('payment_attachments')
      .upsert([...rows], { onConflict: 'path', ignoreDuplicates: true });
    if (error) throw dbError(error);
  }
}
