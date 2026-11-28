import {
  CHANNEL_PAGE_SIZE,
  channelClosedReason,
  channelOpen,
  type ChannelClosedReason,
  type ChannelSenderRole,
} from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { done, isUniqueViolation, maybe, pgError } from '@/common/db/errors';
import type { ChannelMessageRow, ClientSend, NewChannelMessage } from './send/channel-row';

export type { ChannelMessageRow } from './send/channel-row';

/** A unique violation: here, the same client_id resent (channel_messages_client_idx). */

export interface ChannelSummaryRow {
  student_id: string;
  unread: number;
  last_body: string | null;
  last_role: string | null;
  last_at: string | null;
  /** The newest message was deleted for everyone (migration 993). */
  last_deleted?: boolean | null;
}

export const COLUMNS =
  'id, body, sender_profile_id, sender_role, created_at, edited_at, deleted_at, kind, attachment_path, attachment_mime, attachment_size, attachment_name, attachment_duration_ms, reply_to_id, quote_body, quote_kind, quote_sender_name, quote_sender_role, client_id' as const;

/**
 * Student channel reads and writes (migration 800; service role, ChannelAccess decides who may
 * ask).
 */
@Injectable()
export class ChannelRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * The student's channel id; opened here only if the trigger never ran for it (a read first, then
   * an idempotent insert).
   */
  async channelOf(studentId: string): Promise<string> {
    const found = await this.db.from('student_channels').select('id').eq('student_id', studentId).maybeSingle();
    if (found.error) throw pgError(found.error);
    if (found.data) return found.data.id;
    const opened = await this.db
      .from('student_channels')
      .upsert({ student_id: studentId }, { onConflict: 'student_id', ignoreDuplicates: true })
      .select('id');
    if (opened.error) throw pgError(opened.error);
    return opened.data[0]?.id ?? this.channelOf(studentId);
  }

  /** CHANNEL_PAGE_SIZE + 1 messages older than `before` (all when absent), newest first. */
  async page(input: { channelId: string; before?: string | undefined }): Promise<ChannelMessageRow[]> {
    let q = this.db.from('channel_messages').select(COLUMNS).eq('channel_id', input.channelId);
    if (input.before) q = q.lt('created_at', input.before);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(CHANNEL_PAGE_SIZE + 1);
    if (error) throw pgError(error);
    return data;
  }

  /**
   * The new row, `created`; a resend of the same client_id (insert refused by the unique index)
   * answers the stored row, not created.
   */
  async insert(row: NewChannelMessage): Promise<{ row: ChannelMessageRow; created: boolean }> {
    const insert = this.db.from('channel_messages').insert(row);
    const { data, error } = await insert.select(COLUMNS).single();
    if (!error) return { row: data, created: true };
    const send = { channelId: row.channel_id, profileId: row.sender_profile_id };
    const resent = isUniqueViolation(error) && row.client_id;
    const stored = resent ? await this.byClientId({ ...send, clientId: resent }) : null;
    if (!stored) throw pgError(error);
    return { row: stored, created: false };
  }

  /** The row this sender already stored under this client id (a resend), if any. */
  async byClientId(send: ClientSend): Promise<ChannelMessageRow | null> {
    const data = maybe(await this.db
      .from('channel_messages')
      .select(COLUMNS)
      .eq('channel_id', send.channelId)
      .eq('sender_profile_id', send.profileId)
      .eq('client_id', send.clientId)
      .maybeSingle());
    return data;
  }

  /**
   * A participant read the thread up to `at` (never called for a monitor). channel_mark_read
   * never moves the mark back: a late, older request leaves it where it is.
   */
  async setReadMark(input: { channelId: string; profileId: string; at: string }): Promise<void> {
    const args = { p_channel: input.channelId, p_profile: input.profileId, p_at: input.at };
    done(await this.db.rpc('channel_mark_read', args));
  }

  /**
   * channelOpen, as channel_is_open (migration 971): subscribed (past the trial), a teacher
   * assigned.
   */
  async isOpen(studentId: string): Promise<boolean> {
    const s = await this.gate(studentId);
    return s !== null && channelOpen(s);
  }

  /** Why a participant finds the channel closed (channelClosedReason); null while open. */
  async closedReason(studentId: string): Promise<ChannelClosedReason | null> {
    const s = await this.gate(studentId);
    return s ? channelClosedReason(s, { family: false, familyChatOn: true }) : 'not_subscribed';
  }

  private async gate(studentId: string) {
    const read = this.db.from('students').select('status, teacher_id').eq('id', studentId);
    const data = maybe(await read.maybeSingle());
    return data;
  }

  /** The student's current teachers (teachers.id), channel_teacher_ids. */
  async teacherIds(studentId: string): Promise<string[]> {
    const { data, error } = await this.db.rpc('channel_teacher_ids', { p_student_id: studentId });
    if (error) throw pgError(error);
    return data;
  }

  /** The students whose channel this teacher is in now (teacher_channel_student_ids). */
  async teacherStudentIds(teacherId: string): Promise<string[]> {
    const { data, error } = await this.db.rpc('teacher_channel_student_ids', { p_teacher_id: teacherId });
    if (error) throw pgError(error);
    return data;
  }

  /**
   * Unread (messages of `countRoles`, the other side) and last message per channel of these
   * students.
   */
  async summaries(input: { profileId: string; studentIds: readonly string[]; countRoles: readonly ChannelSenderRole[] }): Promise<ChannelSummaryRow[]> {
    if (input.studentIds.length === 0) return [];
    const args = { p_profile: input.profileId, p_student_ids: [...input.studentIds], p_count_roles: [...input.countRoles] };
    const { data, error } = await this.db.rpc('channel_summaries', args);
    if (error) throw pgError(error);
    return data;
  }
}
