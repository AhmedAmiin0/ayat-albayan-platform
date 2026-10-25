import type { StudentStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { notFound } from '../../common/http/errors';
import { dbError } from '../../common/http/http';

export type FamilyStudentRow = { id: string; code: string | null; name: string; status: StudentStatus };

/** The reads of the salesperson's money endpoints that the admin services do not answer (service role). */
@Injectable()
export class SalesFamilyQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The children of the guardian whose phone is this chat, oldest first; [] for a lead or an unknown number. */
  async studentsOfPhone(phone: string): Promise<FamilyStudentRow[]> {
    const { data, error } = await this.db
      .from('students')
      .select('id, code, name, status, guardian:guardians!inner(phone_e164)')
      .eq('guardian.phone_e164', phone)
      .order('created_at');
    if (error) throw dbError(error);
    return data.map(({ id, code, name, status }) => ({ id, code, name, status }));
  }

  /** The phone of the student's family chat (guardians.phone_e164); 404 student_not_found. */
  async familyPhone(studentId: string): Promise<string> {
    const { data, error } = await this.db.from('students').select('guardian:guardians(phone_e164)').eq('id', studentId).maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('student_not_found');
    const phone = data.guardian?.phone_e164;
    if (!phone) throw notFound('family_phone_not_found');
    return phone;
  }

  /** students.status right now (after a payment may have turned a trial active). */
  async studentStatus(studentId: string): Promise<StudentStatus> {
    const { data, error } = await this.db.from('students').select('status').eq('id', studentId).maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('student_not_found');
    return data.status;
  }
}
