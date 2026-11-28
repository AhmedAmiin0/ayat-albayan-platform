import { RoomButton } from '@ab/web-kit/classroom/room/components/RoomButton';
import { REQUEST_TEXT } from '@ab/web-kit/classroom/share/request-text';
import type { RequestButtonProps } from './RequestButton.types';

/** Disabled while the request is pending. */
export function RequestButton({ share, what }: RequestButtonProps) {
  const waiting = share.mine[what] === 'pending';
  const text = REQUEST_TEXT[what];
  if (!share.canRequest) return null;
  return (
    <RoomButton
      icon="hand"
      on={waiting}
      disabled={waiting}
      label={waiting ? text.pending : text.request}
      onClick={() => share.request(what)}
    />
  );
}
