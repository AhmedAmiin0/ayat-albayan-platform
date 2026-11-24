import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { studentOwnerIds } from '@/modules/sales/sales';

/** Reads for the payment-received notice, service role only, never a write. */
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
  ownerIds(studentId: string): Promise<string[]> {
    return studentOwnerIds(this.db, studentId);
  }
}
