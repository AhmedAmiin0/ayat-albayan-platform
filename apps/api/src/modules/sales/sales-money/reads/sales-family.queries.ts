import type { StudentStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { familyOfPhone } from '../../../../common/db/family-of-phone';
import { notFound } from '../../../../common/http/errors';
import { dbError } from '../../../../common/http/http';

export type FamilyStudentRow = { id: string; code: string | null; name: string; status: StudentStatus; teacher_id: string | null };

/** The reads of the salesperson's money endpoints that the admin services do not answer (service role). */
@Injectable()
export class SalesFamilyQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * The children of the family whose number (main or second, familyOfPhone) is this chat, oldest first; [] for
   * a lead or an unknown number.
   */
  async studentsOfPhone(phone: string): Promise<FamilyStudentRow[]> {
    const family = await familyOfPhone(this.db, phone);
    if (!family) return [];
    const { data, error } = await this.db
      .from('students')
      .select('id, code, name, status, teacher_id')
      .eq('guardian_id', family.id)
      .order('created_at');
    if (error) throw dbError(error);
    return data;
  }

  /** Every number of the student's family (main and second, guardian_phones); [] for an unknown student. */
  async phonesOf(studentId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('students')
      .select('guardian:guardians(phones:guardian_phones(phone_e164))')
      .eq('id', studentId)
      .maybeSingle();
    if (error) throw dbError(error);
    return (data?.guardian?.phones ?? []).map((p) => p.phone_e164);
  }

  /** The phone of the student's family chat (guardians.phone_e164); 404 student_not_found. */
  async familyPhone(studentId: string): Promise<string> {
    const phone = await this.phoneOf(studentId);
    if (phone === undefined) throw notFound('student_not_found');
    if (!phone) throw notFound('family_phone_not_found');
    return phone;
  }

  /** guardians.phone_e164 of the student's family; null without one, undefined for an unknown student. */
  async phoneOf(studentId: string): Promise<string | null | undefined> {
    const { data, error } = await this.db.from('students').select('guardian:guardians(phone_e164)').eq('id', studentId).maybeSingle();
    if (error) throw dbError(error);
    return data ? (data.guardian?.phone_e164 ?? null) : undefined;
  }

  /** students.status right now (after a payment may have turned a trial active). */
  async studentStatus(studentId: string): Promise<StudentStatus> {
    const { data, error } = await this.db.from('students').select('status').eq('id', studentId).maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('student_not_found');
    return data.status;
  }

  /**
   * Of these packages, the ones a payment link is still open for (open, not expired; docs/30): the family pays
   * them by the link, so the transfer step never offers them too (one package, never paid twice).
   */
  async linkPackages(subscriptionIds: readonly string[], now = new Date()): Promise<string[]> {
    if (subscriptionIds.length === 0) return [];
    const { data, error } = await this.db
      .from('payment_links')
      .select('subscription_id')
      .in('subscription_id', [...subscriptionIds])
      .eq('status', 'open')
      .gt('expires_at', now.toISOString());
    if (error) throw dbError(error);
    return data.flatMap((r) => (r.subscription_id ? [r.subscription_id] : []));
  }
}
