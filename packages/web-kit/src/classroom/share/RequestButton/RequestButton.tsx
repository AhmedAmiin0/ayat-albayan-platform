import { RoomButton } from '@ab/web-kit/classroom/room/components/RoomButton';
import { REQUEST_TEXT } from '@ab/web-kit/classroom/share/request-text';
import type { RequestKind } from '@ab/web-kit/classroom/share/share-messages';
import type { ShareRequests } from '@ab/web-kit/classroom/share/use-share-requests';

/** Disabled while the request is pending. */
export function RequestButton({ share, what }: { share: ShareRequests; what: RequestKind }) {
  if (!share.canRequest) return null;
  const waiting = share.mine[what] === 'pending';
  const text = REQUEST_TEXT[what];
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
