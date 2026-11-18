import { closedReasonKey } from '@ab/client-core';
import type { ChannelClosedReason } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const NOTE = 'rounded-md border border-rule bg-sunk px-3 py-2 text-sm text-ink-2';

interface Props {
  label: string;
  /** The student's name above the line ('' = none). */
  name: string;
  /** ChannelPage.closed_reason; absent = the subscription line (closedReasonKey). */
  reason?: ChannelClosedReason | null | undefined;
}

/** Before the subscription and the teacher's assignment (owner 2026-10-29): the closed line. */
export function ClosedChannel({ label, name, reason }: Props) {
  return (
    <section aria-label={label} className="grid gap-3">
      {name && <h2 className="font-display text-h3 font-bold">{name}</h2>}
      <p role="status" className={NOTE}>
        {t.studentChannel.closedReasons[closedReasonKey(reason)]}
      </p>
    </section>
  );
}
