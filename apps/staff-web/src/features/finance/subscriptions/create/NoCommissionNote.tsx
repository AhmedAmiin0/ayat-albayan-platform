import { subscriptionAlreadyStarted } from '@ab/money';
import { t } from '@ab/web-kit';

interface Props {
  /** The picked first day (YYYY-MM-DD). */
  startsOn: string;
  /** Zero when not asked. */
  usedBefore: number;
  /** Stands in for the package's created_at; default now. */
  now?: Date;
}

/** Course started before signup (migration 20261028000942) means no commission. */
export function NoCommissionNote({ startsOn, usedBefore, now }: Props) {
  const createdAt = (now ?? new Date()).toISOString();
  if (
    !subscriptionAlreadyStarted({
      starts_on: startsOn,
      created_at: createdAt,
      lessons_used_before: usedBefore,
    })
  )
    return null;
  return <p className="text-xs text-ink-3">{t.salesMoney.noCommissionStarted}</p>;
}
