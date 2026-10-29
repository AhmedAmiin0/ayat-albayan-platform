import type { Db } from '../../../../common/db/db.module';
import { familyOfPhone } from '../../../../common/db/family-of-phone';
import type { ThreadRow } from './threads.mapper';

/** Who a number is when it has no message yet: enough for its people panel and its next lessons. */
export type KnownNumber = Pick<ThreadRow, 'guardian_id' | 'guardian_name' | 'guardian_tz' | 'lead_id' | 'lead_status' | 'teacher_id'>;

function check(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(`known number read failed: ${error.message}`);
}

/**
 * A number with no message (owner report 2026-10-12, «start the conversation»): a guardian by any family
 * number (main or second, familyOfPhone), a lead or a teacher by phone, like v_threads joins them, so the
 * first template can name the family's lesson. null = nobody we know (the composer still offers the
 * templates without a lesson).
 */
export async function knownNumber(db: Db, phone: string): Promise<KnownNumber | null> {
  const [guardian, l, t] = await Promise.all([
    familyOfPhone(db, phone),
    db.from('leads').select('id, status').eq('phone_e164', phone).limit(1),
    db.from('teachers').select('id').eq('phone_e164', phone).limit(1),
  ]);
  check(l.error);
  check(t.error);
  const lead = l.data[0];
  const teacher = t.data[0];
  if (!guardian && !lead && !teacher) return null;
  return {
    guardian_id: guardian?.id ?? null,
    guardian_name: guardian?.name ?? null,
    guardian_tz: guardian?.tz ?? null,
    lead_id: lead?.id ?? null,
    lead_status: lead?.status ?? null,
    teacher_id: teacher?.id ?? null,
  };
}
