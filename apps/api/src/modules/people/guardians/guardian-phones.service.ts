import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { DB, type Db } from '../../../common/db/db.module';
import { notFound } from '../../../common/http/errors';
import { dbError } from './http';

type SecondNumber = { guardianId: string; phone: string; actorId: string };

/**
 * A family's SECOND number (owner 2026-10-29, public.guardian_phones). Only POST /leads/:id/link-family adds one;
 * the admin removes it here, and its chat is a lead chat again. The main number is guardians.phone_e164: changed
 * with PATCH /guardians/:id (the trigger mirrors it), never removed here.
 */
@Injectable()
export class GuardianPhonesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  /** 404 phone_not_found for the main number, another family's number or an unknown one. Audited. */
  async removeSecond({ guardianId, phone, actorId }: SecondNumber): Promise<void> {
    const { data, error } = await this.db
      .from('guardian_phones')
      .delete()
      .eq('guardian_id', guardianId)
      .eq('phone_e164', phone)
      .eq('is_primary', false)
      .select('phone_e164');
    if (error) throw dbError(error);
    if (data.length === 0) throw notFound('phone_not_found');
    await this.audit.record({ actorId, entity: 'guardians', entityId: guardianId, action: 'phone_removed', before: { phone_e164: phone } });
  }
}
