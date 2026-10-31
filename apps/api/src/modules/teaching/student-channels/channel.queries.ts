import { CHANNEL_PAGE_SIZE, channelOpen, type ChannelSenderRole } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

export interface ChannelMessageRow {
  id: string;
  body: string;
  sender_profile_id: string | null;
  sender_role: string;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
}

export interface ChannelSummaryRow {
  student_id: string;
  unread: number;
  last_body: string | null;
  last_role: string | null;
  last_at: string | null;
  /** The newest message was deleted for everyone (migration 986). */
  last_deleted?: boolean | null;
}

export const COLUMNS = 'id, body, sender_profile_id, sender_role, created_at, edited_at, deleted_at' as const;

/** Student channel reads and writes (migration 800; service role, ChannelAccess decides who may ask). */
@Injectable()
export class ChannelQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The student's channel id; opened here only if the trigger never ran for it (a read first, then an idempotent insert). */
  async channelOf(studentId: string): Promise<string> {
    const found = await this.db.from('student_channels').select('id').eq('student_id', studentId).maybeSingle();
    if (found.error) throw dbError(found.error);
    if (found.data) return found.data.id;
    const opened = await this.db
      .from('student_channels')
      .upsert({ student_id: studentId }, { onConflict: 'student_id', ignoreDuplicates: true })
      .select('id');
    if (opened.error) throw dbError(opened.error);
    return opened.data[0]?.id ?? this.channelOf(studentId);
  }

  /** CHANNEL_PAGE_SIZE + 1 messages older than `before` (all when absent), newest first. */
  async page(input: { channelId: string; before?: string | undefined }): Promise<ChannelMessageRow[]> {
    let q = this.db.from('channel_messages').select(COLUMNS).eq('channel_id', input.channelId);
    if (input.before) q = q.lt('created_at', input.before);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(CHANNEL_PAGE_SIZE + 1);
    if (error) throw dbError(error);
    return data;
  }

  async insert(row: { channel_id: string; sender_profile_id: string; sender_role: ChannelSenderRole; body: string }): Promise<ChannelMessageRow> {
    const { data, error } = await this.db.from('channel_messages').insert(row).select(COLUMNS).single();
    if (error) throw dbError(error);
    return data;
  }

  /** A participant read the thread up to now (never called for a monitor). */
  async setReadMark(input: { channelId: string; profileId: string; at: string }): Promise<void> {
    const row = { channel_id: input.channelId, profile_id: input.profileId, last_read_at: input.at };
    const { error } = await this.db.from('channel_reads').upsert(row, { onConflict: 'channel_id,profile_id' });
    if (error) throw dbError(error);
  }

  /** channelOpen, the rule of channel_is_open (migration 971): subscribed (past the trial) and a teacher assigned. */
  async isOpen(studentId: string): Promise<boolean> {
    const { data, error } = await this.db.from('students').select('status, teacher_id').eq('id', studentId).maybeSingle();
    if (error) throw dbError(error);
    return data !== null && channelOpen(data);
  }

  /** The student's current teachers (teachers.id), channel_teacher_ids. */
  async teacherIds(studentId: string): Promise<string[]> {
    const { data, error } = await this.db.rpc('channel_teacher_ids', { p_student_id: studentId });
    if (error) throw dbError(error);
    return data;
  }

  /** The students whose channel this teacher is in now (teacher_channel_student_ids). */
  async teacherStudentIds(teacherId: string): Promise<string[]> {
    const { data, error } = await this.db.rpc('teacher_channel_student_ids', { p_teacher_id: teacherId });
    if (error) throw dbError(error);
    return data;
  }

  /** Unread (messages of `countRoles`, the other side) and last message per channel of these students. */
  async summaries(input: { profileId: string; studentIds: readonly string[]; countRoles: readonly ChannelSenderRole[] }): Promise<ChannelSummaryRow[]> {
    if (input.studentIds.length === 0) return [];
    const args = { p_profile: input.profileId, p_student_ids: [...input.studentIds], p_count_roles: [...input.countRoles] };
    const { data, error } = await this.db.rpc('channel_summaries', args);
    if (error) throw dbError(error);
    return data;
  }
}
