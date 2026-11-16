import { seatError, type SeatError } from '@ab/client-core';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import type { ChannelSeatApi } from './use-channel-seat';

const S = t.studentChannel.seat;

/** 409: another assistant got there first; anything else: try again. */
const ERRORS: Readonly<Record<SeatError, string>> = {
  taken: S.taken,
  failed: t.studentChannel.actions.failed,
};

interface TakeSeatButtonProps {
  seat: ChannelSeatApi;
  /** «تولَّ المحادثة» for a free seat, «انقل المحادثة إليك» to take over my own student's. */
  label: string;
  /** The takeover's why, as the button's tooltip. */
  hint?: string;
}

/**
 * Take the seat (owner 2026-11-16): a free one, one a former assistant left behind, or the
 * student I brought, from whoever holds it («who brought the student have the priority»). Once
 * mine, the row's chat button takes its place.
 */
export function TakeSeatButton({ seat, label, hint }: TakeSeatButtonProps) {
  const { error, isPending, mutate } = seat.take;
  return (
    <div className="grid justify-items-start gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isPending}
        title={hint}
        onClick={() => mutate()}
      >
        {isPending ? S.taking : label}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {ERRORS[seatError(error)]}
        </span>
      ) : null}
    </div>
  );
}
