import { Inject, Injectable } from '@nestjs/common';
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
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The delete and its audit row in one transaction (remove_family_phone, migration 973). 404 phone_not_found for the main number, another family's number or an unknown one. */
  async removeSecond({ guardianId, phone, actorId }: SecondNumber): Promise<void> {
    const { error } = await this.db.rpc('remove_family_phone', { p_guardian: guardianId, p_phone: phone, p_actor: actorId });
    if (error?.code === 'P0001' && error.message === 'phone_not_found') throw notFound('phone_not_found');
    if (error) throw dbError(error);
  }
}
