import type { Json } from '@ab/db';
import type { BookingResult, Gender, LeadStatus, LessonStatus, PackageSize, Program, StudentStatus } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { gateConfirmations } from '../../common/rules/confirmations';
import { NotificationPolicy } from '../notification-rules/policy';
import { domainError } from './booking.errors';
import { dbError } from '../teachers/http';
import type { LeadFacts } from './booking.lead-merge';
import { toBookingResult, type BookingPayload, type InvoiceRow } from './booking.mapper';

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
/** meeting_mode: teachers.meeting_mode (migration 490), null = the academy default; optional in fakes. */
export type BookingTeacher = { id: string; tz: string; meeting_link: string | null; meeting_mode?: string | null };
/** The lesson a makeup would replace, with who was on it and whether each was charged. */
export type MakeupOriginalRow = {
  id: string;
  status: LessonStatus;
  starts_at: string;
  makeup_of_id: string | null;
  rule: { package: PackageSize | null } | null;
  lesson_students: { student_id: string; chargeable: boolean }[];
};

const STUDENT_COLUMNS = `id, name, program, teacher_gender_pref, meeting_link_override, guardian:guardians!inner(id, phone_e164, tz)`;

/** Every DB touch of the booking wizard (service role; the controller is admin-only). */
@Injectable()
export class BookingQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly policy: NotificationPolicy,
  ) {}

  async teacher(id: string): Promise<BookingTeacher | null> {
    const { data, error } = await this.db
      .from('teachers')
      .select('id, tz, meeting_link, meeting_mode')
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

  async lead(id: string): Promise<(LeadFacts & { status: LeadStatus }) | null> {
    const { data, error } = await this.db
      .from('leads')
      .select('id, status, source, qualification, phone_e164')
      .eq('id', id)
      .maybeSingle();
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

  async makeupOriginal(lessonId: string): Promise<MakeupOriginalRow | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select(
        'id, status, starts_at, makeup_of_id, rule:schedule_rules!lessons_rule_id_fkey(package), lesson_students(student_id, chargeable)',
      )
      .eq('id', lessonId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The booking's stored invoice, if this request already saved one (a replay never copies again). */
  async invoiceByRequest(requestId: string): Promise<InvoiceRow | null> {
    const { data, error } = await this.db
      .from('invoices')
      .select('kind, storage_path, mime, size_bytes, source, message_id')
      .eq('client_request_id', requestId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data || data.kind === 'trial') return null;
    const { storage_path: path, ...rest } = data;
    return { ...rest, kind: data.kind, path, source: data.source === 'whatsapp' ? 'whatsapp' : 'upload' };
  }

  /** The booking this request already made (rule 8), null when it is new. No plan, no conflict check. */
  async replay(requestId: string): Promise<BookingResult | null> {
    const { data: rule, error } = await this.db.from('schedule_rules').select('id').eq('client_request_id', requestId).maybeSingle();
    if (error) throw dbError(error);
    if (!rule) return null;
    const { data, error: failed } = await this.db.rpc('booking_result', { p_rule: rule.id });
    if (failed) throw dbError(failed);
    return toBookingResult(data);
  }

  /** Rule + students + lessons + lead + queued messages in one transaction (docs/10 §5 #14). */
  /** create_booking; its booking_confirmation* rows only while that notification rule is on (gateConfirmations). */
  async createBooking(payload: BookingPayload, actorId: string): Promise<BookingResult> {
    const gated = payload.messages ? { ...payload, messages: await gateConfirmations(this.policy, payload.messages) } : payload;
    const p_booking = gated as unknown as Json; // typed payload; the RPC validates it in SQL
    const call = () => this.db.rpc('create_booking', { p_booking, p_actor: actorId });
    let { data, error } = await call();
    // Two replays at once: the loser hits client_request_id's unique key; the retry returns the
    // winner's booking (migration 111).
    if (error?.code === '23505' && error.message.includes('client_request_id')) ({ data, error } = await call());
    if (error?.code === 'P0001' && error.message.includes('makeup_not_eligible')) {
      throw domainError(HttpStatus.CONFLICT, 'makeup_not_eligible');
    }
    // Another admin booked the same missed lesson a moment ago (lessons_makeup_of_key).
    if (error?.code === '23505' && error.message.includes('lessons_makeup_of_key')) {
      throw domainError(HttpStatus.CONFLICT, 'makeup_exists');
    }
    if (error) throw dbError(error);
    return toBookingResult(data);
  }
}
