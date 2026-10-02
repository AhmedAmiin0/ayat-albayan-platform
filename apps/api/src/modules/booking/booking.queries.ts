import {
  OCCUPYING_LESSON_STATUSES,
  type BookingResult,
  type Gender,
  type LeadStatus,
  type Program,
} from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '../../common/db/db.module';
import type { StudentBusyLesson } from '../scheduling/conflicts';
import { dbError } from '../teachers/http';
import { toBookingResult, type BookingPayload } from './booking.mapper';

export type Range = { from: Date; to: Date };
export type BookingStudent = {
  id: string;
  name: string;
  program: Program;
  teacher_gender_pref: Gender | null;
  meeting_link_override: string | null;
  guardian: { id: string; phone_e164: string; tz: string };
};
export type BookingTeacher = { id: string; tz: string; meeting_link: string | null };

const STUDENT_COLUMNS = `id, name, program, teacher_gender_pref, meeting_link_override, guardian:guardians!inner(id, phone_e164, tz)`;

// ponytail: create_booking is not in packages/db types.ts until the integrator regenerates it
// (`pnpm --filter @ab/db gen:types`); then call this.db.rpc directly and drop this type.
type UntypedRpc = {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: PostgrestError | null }>;
};

/** Every DB touch of the booking wizard (service role; the controller is admin-only). */
@Injectable()
export class BookingQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async teacher(id: string): Promise<BookingTeacher | null> {
    const { data, error } = await this.db
      .from('teachers')
      .select('id, tz, meeting_link')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The students that exist among `ids`, with their guardian (missing ids are simply absent). */
  async students(ids: readonly string[]): Promise<BookingStudent[]> {
    const { data, error } = await this.db.from('students').select(STUDENT_COLUMNS).in('id', ids);
    if (error) throw dbError(error);
    return data;
  }

  async lead(id: string): Promise<{ id: string; status: LeadStatus } | null> {
    const { data, error } = await this.db.from('leads').select('id, status').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Phones are unique per guardian, so the lead path reuses the guardian with this phone. */
  async guardianByPhone(e164: string): Promise<{ id: string; tz: string } | null> {
    const { data, error } = await this.db
      .from('guardians')
      .select('id, tz')
      .eq('phone_e164', e164)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The students' occupying lessons overlapping `range`, one row per (lesson, student). */
  async studentBusyLessons(studentIds: readonly string[], range: Range): Promise<StudentBusyLesson[]> {
    const { data, error } = await this.db
      .from('lesson_students')
      .select('student_id, lessons!inner(id, starts_at, ends_at)')
      .in('student_id', studentIds)
      .in('lessons.status', OCCUPYING_LESSON_STATUSES)
      .lt('lessons.starts_at', range.to.toISOString())
      .gt('lessons.ends_at', range.from.toISOString());
    if (error) throw dbError(error);
    return data.map(({ student_id, lessons: l }) => ({
      id: l.id,
      student_id,
      starts_at: new Date(l.starts_at),
      ends_at: new Date(l.ends_at),
    }));
  }

  /** Rule + students + lessons + lead + queued messages in one transaction (docs/10 §5 #14). */
  async createBooking(payload: BookingPayload, actorId: string): Promise<BookingResult> {
    const db = this.db as unknown as UntypedRpc;
    const { data, error } = await db.rpc('create_booking', { p_booking: payload, p_actor: actorId });
    if (error) throw dbError(error);
    return toBookingResult(data);
  }
}
