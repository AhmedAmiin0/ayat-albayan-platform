import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

const present = (ids: readonly (string | null)[]): string[] => ids.flatMap((id) => (id ? [id] : []));

/** The reads of «تم استلام دفعة»: who is told (service role; never a write). */
@Injectable()
export class PaymentReceivedRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every enabled base-role admin. */
  async adminIds(): Promise<string[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .is('disabled_at', null);
    if (error) throw dbError(error);
    return data.map((p) => p.id);
  }

  /**
   * The student's following assistant(s), as the ownership rule reads them (sales-ownership.ts):
   * who brought the student (students.brought_by) and who holds the lead its family came from
   * (leads.assigned_to of the converted guardian). An unknown student: nobody.
   */
  async ownerIds(studentId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('students')
      .select('brought_by, guardian_id')
      .eq('id', studentId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data ? [...present([data.brought_by]), ...(await this.leadOwners(data.guardian_id))] : [];
  }

  private async leadOwners(guardianId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('leads')
      .select('assigned_to')
      .eq('converted_guardian_id', guardianId);
    if (error) throw dbError(error);
    return present(data.map((l) => l.assigned_to));
  }
}
