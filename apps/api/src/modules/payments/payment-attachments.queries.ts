import type { Tables, TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

export type PaymentAttachmentRow = Pick<Tables<'payment_attachments'>, 'id' | 'path' | 'mime' | 'size' | 'created_at'>;

/** All supabase access for `payment_attachments` (service role; the API is the only writer). */
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

  /** Idempotent on the unique path: a replayed form never duplicates a row. */
  async save(rows: readonly TablesInsert<'payment_attachments'>[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await this.db
      .from('payment_attachments')
      .upsert([...rows], { onConflict: 'path', ignoreDuplicates: true });
    if (error) throw dbError(error);
  }
}
