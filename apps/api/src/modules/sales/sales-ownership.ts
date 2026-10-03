import type { Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

/**
 * What a salesperson owns (migration 187, in TypeScript because the API runs as the service role):
 * leads.assigned_to = their profile -> leads.converted_guardian_id -> guardians -> students.
 */
export interface SalesOwnership {
  leadIds: string[];
  guardianIds: string[];
  studentIds: string[];
  /** E.164: their leads' phones plus the phones of the guardians those leads became. */
  phones: string[];
}

export const NO_OWNERSHIP: SalesOwnership = { leadIds: [], guardianIds: [], studentIds: [], phones: [] };

// ponytail: the chain goes in the URL (.in); a salesperson has tens to low hundreds of leads, fine until thousands.
export async function ownershipOf(db: Db, profileId: string): Promise<SalesOwnership> {
  const leads = await db.from('leads').select('id, phone_e164, converted_guardian_id').eq('assigned_to', profileId);
  if (leads.error) throw dbError(leads.error);
  const guardianIds = [...new Set(leads.data.flatMap((l) => (l.converted_guardian_id ? [l.converted_guardian_id] : [])))];
  const phones = new Set(leads.data.map((l) => l.phone_e164));
  if (guardianIds.length === 0) return { ...NO_OWNERSHIP, leadIds: leads.data.map((l) => l.id), phones: [...phones] };
  const [guardians, students] = await Promise.all([
    db.from('guardians').select('phone_e164').in('id', guardianIds),
    db.from('students').select('id').in('guardian_id', guardianIds),
  ]);
  if (guardians.error) throw dbError(guardians.error);
  if (students.error) throw dbError(students.error);
  for (const g of guardians.data) if (g.phone_e164) phones.add(g.phone_e164);
  return { leadIds: leads.data.map((l) => l.id), guardianIds, studentIds: students.data.map((s) => s.id), phones: [...phones] };
}
