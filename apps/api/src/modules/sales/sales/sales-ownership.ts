import type { Db } from '../../../common/db/db.module';
import { dbError } from '../../../common/http/http';

/**
 * What a salesperson owns (migrations 187 and 274, in TypeScript because the API runs as the service role):
 * leads.assigned_to = their profile -> leads.converted_guardian_id -> guardians -> students, plus the
 * students they BROUGHT (students.brought_by = their profile) and those students' guardians.
 */
export interface SalesOwnership {
  leadIds: string[];
  guardianIds: string[];
  studentIds: string[];
  /** E.164: their leads' phones plus every number (main and second) of their leads' and brought students' families. */
  phones: string[];
}

export const NO_OWNERSHIP: SalesOwnership = { leadIds: [], guardianIds: [], studentIds: [], phones: [] };

const uniq = (ids: readonly string[]): string[] => [...new Set(ids)];

// ponytail: the chain goes in the URL (.in); a salesperson has tens to low hundreds of leads and students, fine until thousands.
export async function ownershipOf(db: Db, profileId: string): Promise<SalesOwnership> {
  const [leads, brought] = await Promise.all([
    db.from('leads').select('id, phone_e164, converted_guardian_id').eq('assigned_to', profileId),
    db.from('students').select('id, guardian_id').eq('brought_by', profileId),
  ]);
  if (leads.error) throw dbError(leads.error);
  if (brought.error) throw dbError(brought.error);
  const leadGuardians = uniq(leads.data.flatMap((l) => (l.converted_guardian_id ? [l.converted_guardian_id] : [])));
  const guardianIds = uniq([...leadGuardians, ...brought.data.map((s) => s.guardian_id)]);
  const phones = new Set(leads.data.map((l) => l.phone_e164));
  const leadIds = leads.data.map((l) => l.id);
  if (guardianIds.length === 0) return { ...NO_OWNERSHIP, leadIds, phones: [...phones] };
  const [guardians, families] = await Promise.all([
    // Every family number, main and second (guardian_phones, owner 2026-10-29), as my_sales_phones (migration 974).
    db.from('guardian_phones').select('phone_e164').in('guardian_id', guardianIds),
    // Their lead families' children (as before); a brought student is theirs wherever the family came from.
    leadGuardians.length > 0 ? db.from('students').select('id').in('guardian_id', leadGuardians) : { data: [], error: null },
  ]);
  if (guardians.error) throw dbError(guardians.error);
  if (families.error) throw dbError(families.error);
  for (const g of guardians.data) if (g.phone_e164) phones.add(g.phone_e164);
  const studentIds = uniq([...families.data.map((s) => s.id), ...brought.data.map((s) => s.id)]);
  return { leadIds, guardianIds, studentIds, phones: [...phones] };
}

/** Who owns a family (docs/21 §6): its children's brought_by plus its converted leads' assigned_to, nulls dropped. */
export async function guardianOwnerIds(db: Db, guardianId: string): Promise<string[]> {
  const [brought, leads] = await Promise.all([
    db.from('students').select('brought_by').eq('guardian_id', guardianId),
    db.from('leads').select('assigned_to').eq('converted_guardian_id', guardianId),
  ]);
  if (brought.error) throw dbError(brought.error);
  if (leads.error) throw dbError(leads.error);
  const ids = [...brought.data.map((s) => s.brought_by), ...leads.data.map((l) => l.assigned_to)];
  return uniq(ids.flatMap((id) => (id ? [id] : [])));
}
