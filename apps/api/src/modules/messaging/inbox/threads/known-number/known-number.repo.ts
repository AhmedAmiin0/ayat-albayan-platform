import type { Db } from '@/common/db/db.module';
import { familyOfPhone } from '@/common/db/family-of-phone';
import { knownOf, type KnownNumber } from './known-number';
import { check } from '@/modules/messaging/inbox/threads/store/check';

/**
 * A number with no message (staff start the conversation): a guardian by any family
 * number (main or second, familyOfPhone), a lead or a teacher by phone, like v_threads joins them,
 * so the first template can name the family's lesson.
 */
export async function knownNumber(db: Db, phone: string): Promise<KnownNumber | null> {
  const [guardian, l, t] = await Promise.all([
    familyOfPhone(db, phone),
    db.from('leads').select('id, status').eq('phone_e164', phone).limit(1),
    db.from('teachers').select('id').eq('phone_e164', phone).limit(1),
  ]);
  check(l.error, 'known number read');
  check(t.error, 'known number read');
  return knownOf({ guardian, lead: l.data[0], teacher: t.data[0] });
}
