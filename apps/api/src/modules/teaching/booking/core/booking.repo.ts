import type { Json } from '@ab/db';
import type { LeadStatus, StudentStatus } from '@ab/catalog';
import type { BookingResult } from '@ab/schedule';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { gateConfirmations } from '@/common/rules/confirmations';
import { NotificationPolicy } from '@/modules/messaging/notification-rules/policy/policy';
import { maybe, pgError, rows, uniqueViolationMentions } from '@/common/db/errors';
import type { LeadFacts } from './booking.lead-merge';
import { toBookingResult, type BookingPayload, type InvoiceRow } from './booking.mapper';
import type { BookingStudent, BookingTeacher, MakeupOriginalRow } from './types';
import { httpError } from '@/common/http/errors';

type GuardianOnFile = {
  id: string;
  tz: string;
  students: { id: string; code: string | null; name: string; status: StudentStatus }[];
};

/**
 * create_booking's raised codes: the lesson changed (makeup_not_eligible), the package got its
 * course (course_exists, migration 20261106000501) or the teacher was booked at this time
 * (teacher_clash, migration 20261123000200) between the API's read and the write.
 */
const BOOKING_RAISED = ['makeup_not_eligible', 'course_exists', 'teacher_clash'] as const;
const STUDENT_COLUMNS = `id, name, program, teacher_gender_pref, meeting_link_override, guardian:guardians!inner(id, phone_e164, tz)`;

/** Every DB touch of the booking wizard (service role; the controller is admin-only). */
@Injectable()
export class BookingRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly policy: NotificationPolicy,
  ) {}

  async teacher(id: string): Promise<BookingTeacher | null> {
    const data = maybe(await this.db
      .from('teachers')
      .select('id, tz, meeting_link, meeting_mode')
      .eq('id', id)
      .maybeSingle());
    return data;
  }

  /** The students that exist among `ids`, with their guardian (missing ids are simply absent). */
  async students(ids: readonly string[]): Promise<BookingStudent[]> {
    const data = rows(await this.db.from('students').select(STUDENT_COLUMNS).in('id', ids));
    return data;
  }

  async lead(id: string): Promise<(LeadFacts & { status: LeadStatus }) | null> {
    const data = maybe(await this.db
      .from('leads')
      .select('id, status, source, qualification, phone_e164')
      .eq('id', id)
      .maybeSingle());
    return data;
  }

  /** Phones are unique per guardian, so the lead path reuses the guardian with this phone. */
  async guardianByPhone(e164: string): Promise<GuardianOnFile | null> {
    const data = maybe(await this.db
      .from('guardians')
      .select('id, tz, students(id, code, name, status)')
      .eq('phone_e164', e164)
      .maybeSingle());
    return data;
  }

  async makeupOriginal(lessonId: string): Promise<MakeupOriginalRow | null> {
    const data = maybe(await this.db
      .from('lessons')
      .select(
        'id, status, starts_at, makeup_of_id, rule:schedule_rules!lessons_rule_id_fkey(package), lesson_students(student_id, chargeable)',
      )
      .eq('id', lessonId)
      .maybeSingle());
    return data;
  }

  /** The booking's stored invoice, if this request already saved one (a replay never copies again). */
  async invoiceByRequest(requestId: string): Promise<InvoiceRow | null> {
    const data = maybe(await this.db
      .from('invoices')
      .select('kind, storage_path, mime, size_bytes, source, message_id')
      .eq('client_request_id', requestId)
      .maybeSingle());
    if (!data || data.kind === 'trial') return null;
    const { storage_path: path, ...rest } = data;
    return { ...rest, kind: data.kind, path, source: data.source === 'whatsapp' ? 'whatsapp' : 'upload' };
  }

  /** The booking this request already made (rule 8), null when it is new. No plan, no conflict check. */
  async replay(requestId: string): Promise<BookingResult | null> {
    const { data: rule, error } = await this.db.from('schedule_rules').select('id').eq('client_request_id', requestId).maybeSingle();
    if (error) throw pgError(error);
    if (!rule) return null;
    const { data, error: failed } = await this.db.rpc('booking_result', { p_rule: rule.id });
    if (failed) throw pgError(failed);
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
    if (uniqueViolationMentions(error, 'client_request_id')) ({ data, error } = await call());
    const raised = error?.code === 'P0001' ? BOOKING_RAISED.find((c) => error.message.includes(c)) : undefined;
    if (raised) throw httpError(HttpStatus.CONFLICT, raised);
    // Another admin booked the same missed lesson a moment ago (lessons_makeup_of_key).
    if (uniqueViolationMentions(error, 'lessons_makeup_of_key')) {
      throw httpError(HttpStatus.CONFLICT, 'makeup_exists');
    }
    // A new guardian on a family's SECOND number (migration 973): guardianByPhone reads main numbers only.
    if (uniqueViolationMentions(error, 'guardian_phones_pkey')) throw httpError(HttpStatus.CONFLICT, 'number_taken');
    if (error) throw pgError(error);
    return toBookingResult(data);
  }
}
