import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

/** One student's seat as stored, with what the rule needs. */
export interface SeatRow {
  /** students.brought_by: she has the priority. */
  broughtBy: string | null;
  /** student_channels.assistant_id as stored (the compare-and-set compares against it). */
  heldBy: string | null;
  /** The holder while she is still a salesperson, by name; a former one reads as free. */
  holder: { id: string; name: string } | null;
}

/**
 * The one assistant seat of a student chat (student_channels.assistant_id, migration
 * 20261117090200; any assistant may take it, one at a time). Service role: ChannelSeatService
 * decides who may take it.
 */
@Injectable()
export class ChannelSeatRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** null: no such student. */
  async read(studentId: string): Promise<SeatRow | null> {
    const [student, channel] = await Promise.all([
      this.db.from('students').select('brought_by').eq('id', studentId).maybeSingle(),
      this.db
        .from('student_channels')
        .select('assistant_id')
        .eq('student_id', studentId)
        .maybeSingle(),
    ]);
    if (student.error) throw dbError(student.error);
    if (channel.error) throw dbError(channel.error);
    if (!student.data) return null;
    const heldBy = channel.data?.assistant_id ?? null;
    return { broughtBy: student.data.brought_by, heldBy, holder: await this.assistant(heldBy) };
  }

  /**
   * Compare-and-set (race-safe): the seat moves to `profileId` only while it still holds `from`
   * as read (null = free). A lost race changes nothing; the caller reads the seat again.
   */
  async take(input: { studentId: string; profileId: string; from: string | null }): Promise<void> {
    const seat = this.db
      .from('student_channels')
      .update({ assistant_id: input.profileId })
      .eq('student_id', input.studentId);
    const { error } = await (input.from === null
      ? seat.is('assistant_id', null)
      : seat.eq('assistant_id', input.from));
    if (error) throw dbError(error);
  }

  /** The holder frees it; anyone else changes nothing. */
  async leave(input: { studentId: string; profileId: string }): Promise<void> {
    const { error } = await this.db
      .from('student_channels')
      .update({ assistant_id: null })
      .eq('student_id', input.studentId)
      .eq('assistant_id', input.profileId);
    if (error) throw dbError(error);
  }

  /** A salesperson's profile name (never a phone or email); null for anyone else. */
  private async assistant(id: string | null): Promise<SeatRow['holder']> {
    if (id === null) return null;
    const { data, error } = await this.db
      .from('profiles')
      .select('id, full_name')
      .eq('id', id)
      .eq('role', 'sales')
      .maybeSingle();
    if (error) throw dbError(error);
    return data && { id: data.id, name: data.full_name };
  }
}
