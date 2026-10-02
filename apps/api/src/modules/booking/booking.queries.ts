import type { Json } from '@ab/db';
import type { BookingResult, Gender, LeadStatus, Program, StudentStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import { toBookingResult, type BookingPayload } from './booking.mapper';

export type Range = { from: Date; to: Date };
export type GuardianOnFile = {
  id: string;
  tz: string;
  students: { id: string; code: string | null; name: string; status: StudentStatus }[];
};
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
  async guardianByPhone(e164: string): Promise<GuardianOnFile | null> {
    const { data, error } = await this.db
      .from('guardians')
      .select('id, tz, students(id, code, name, status)')
      .eq('phone_e164', e164)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Rule + students + lessons + lead + queued messages in one transaction (docs/10 §5 #14). */
  async createBooking(payload: BookingPayload, actorId: string): Promise<BookingResult> {
    const p_booking = payload as unknown as Json; // typed payload; the RPC validates it in SQL
    const call = () => this.db.rpc('create_booking', { p_booking, p_actor: actorId });
    let { data, error } = await call();
    // Two replays at once: the loser hits client_request_id's unique key; the retry returns the
    // winner's booking (migration 111).
    if (error?.code === '23505' && error.message.includes('client_request_id')) ({ data, error } = await call());
    if (error) throw dbError(error);
    return toBookingResult(data);
  }
}
