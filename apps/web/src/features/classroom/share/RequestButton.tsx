import { RoomButton } from '../RoomButton';
import { REQUEST_TEXT } from './request-text';
import type { RequestKind } from './share-messages';
import type { ShareRequests } from './use-share-requests';

/** A guest's «اطلب …» (screen, writing, opening the board): disabled with «بانتظار…» while pending. */
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
