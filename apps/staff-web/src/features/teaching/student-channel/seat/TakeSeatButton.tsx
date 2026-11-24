import { seatErrorText } from '@ab/client-core';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { ChannelSeatApi } from './use-channel-seat';

const S = t.studentChannel.seat;

interface TakeSeatButtonProps {
  seat: ChannelSeatApi;
  /** A free seat is taken; my own student's is transferred to me. */
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
          {seatErrorText(error, t.studentChannel)}
        </span>
      ) : null}
    </div>
  );
}
