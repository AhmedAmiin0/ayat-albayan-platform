import { subscriptionAlreadyStarted } from '@ab/money';
import { t } from '@ab/mobile-kit';
import { Note } from '@/more';

interface NoCommissionNoteProps {
  /** The picked first day (YYYY-MM-DD). */
  startsOn: string;
  /** Zero when not asked. */
  usedBefore: number;
  /** Stands in for the package's created_at. */
  now: Date;
}

/** Course started before signup (migration 20261028000942) means no commission. */
export function NoCommissionNote({ startsOn, usedBefore, now }: NoCommissionNoteProps) {
  const fact = { starts_on: startsOn, created_at: now.toISOString(), lessons_used_before: usedBefore };
  return subscriptionAlreadyStarted(fact) ? <Note>{t.salesMoney.noCommissionStarted}</Note> : null;
}
