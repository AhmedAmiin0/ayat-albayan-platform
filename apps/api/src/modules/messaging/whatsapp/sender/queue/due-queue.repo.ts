import { onMessagingLine } from '@ab/catalog';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';
import { isStaffAlert, staffTeacherId, type StaffAtSend } from '@/modules/messaging/reminders';
import { LANE_ROWS } from '@/modules/messaging/whatsapp/sender/drain';
import { SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';
import { AUTO_OFF, AUTOMATIC_KEYS } from '@/modules/messaging/whatsapp/sender/send-stale';
import {
  DUE_COLUMNS, NOT_APP_SENT, type DueMessage,
} from '@/modules/messaging/whatsapp/sender/sender.due';
import type { AnyDueInput, DueQuery, StaffAlertRow } from './due-queue.types';

/** Without a chat client, chat-stamped texts are never read (they would fill the batch forever). */
const NOT_CHAT_TEXT = 'template_key.not.is.null,line.is.null,line.neq.chat';

const failed =
  (what: string) =>
  (e: { message: string }): Error =>
    new Error(`${what} failed: ${e.message}`);

/** The outbound queue's reads and its automatic hold (docs/12 §3.3), for SenderRepo. */
@Injectable()
export class DueQueueRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** See SenderRepo.due. */
  async due(input: DueQuery): Promise<DueMessage[]> {
    const now = input.now.toISOString();
    const approved = input.keys.length ? `,template_key.in.(${input.keys.join(',')})` : '';
    const query = this.db
      .from('messages')
      .select(DUE_COLUMNS)
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
      .or(`template_key.is.null${approved}`)
      .or(NOT_APP_SENT)
      .or('line.is.null,line.neq.calls'); // never a row of the calls number (docs/28 §10)
    const laned = input.lane ? query.or(LANE_ROWS[input.lane]) : query; // docs/42 42-7
    const sendable = input.chatConfigured ? laned : laned.or(NOT_CHAT_TEXT);
    const scoped = input.allowed ? sendable.in('phone_e164', [...input.allowed]) : sendable;
    const ordered = scoped
      .order('scheduled_for', { ascending: true, nullsFirst: true })
      .order('created_at');
    const { data, error } = await ordered.limit(input.limit);
    if (error) throw pgError(error);
    return data.filter(onMessagingLine);
  }

  /**
   * The idle tick's one read (messages_queue_idx): is any queued outbound row due now (in the
   * allow-list when one is set)? A superset of due() (any template, any line), so false never
   * skips a row due() would have read; true runs the pass exactly as before.
   */
  async anyDue(input: AnyDueInput): Promise<boolean> {
    const now = input.now.toISOString();
    const all = this.db
      .from('messages')
      .select('id')
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`);
    const queued = input.lane ? all.or(LANE_ROWS[input.lane]) : all; // docs/42 42-7: its lane only
    const scoped = input.allowed ? queued.in('phone_e164', [...input.allowed]) : queued;
    const { data, error } = await scoped.limit(1);
    if (error) throw pgError(error, { otherwise: failed('outbound queue probe') });
    return data.length > 0;
  }

  /**
   * Automatic messages OFF: every job-made reminder / follow-up / renewal still queued is held
   * (failed «auto_off», no push), also under a template Meta has not approved yet, which due()
   * never reads and which would otherwise go out on its own once approved and switched ON. Not a
   * row already claimed (SENDING): Meta may have sent it; the worker asks the admin. The count.
   */
  async holdAutomatic(allowed: readonly string[] | null): Promise<number> {
    const held = { status: 'failed' as const, error_code: AUTO_OFF.code, error_text: AUTO_OFF.text };
    const query = this.db
      .from('messages')
      .update({ ...held, next_attempt_at: null })
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .is('created_by', null)
      .in('template_key', [...AUTOMATIC_KEYS])
      .or(`error_code.is.null,error_code.neq.${SENDING}`);
    const scoped = allowed ? query.in('phone_e164', [...allowed]) : query;
    const { data, error } = await scoped.select('id');
    if (error) throw pgError(error, { otherwise: failed('automatic hold') });
    return data.length;
  }

  /**
   * A staff alert's teacher as on record right now (send-stale staffStale): by the teacher id in
   * its dedup_key, else by the number it goes to. undefined for every other row (guardians,
   * families, leads: unchanged). A failed read throws: the worker skips the row and retries it.
   */
  async staffAtSend(row: StaffAlertRow): Promise<StaffAtSend[] | undefined> {
    if (!isStaffAlert(row.template_key)) return undefined;
    const id = staffTeacherId(row.dedup_key);
    const query = this.db
      .from('teachers')
      .select('status, phone_e164, profile:profiles!teachers_profile_id_fkey(disabled_at)');
    const { data, error } = await (id ? query.eq('id', id) : query.eq('phone_e164', row.phone_e164));
    if (error) throw pgError(error, { otherwise: failed('staff alert teacher read') });
    return data;
  }
}
