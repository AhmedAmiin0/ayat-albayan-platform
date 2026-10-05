import type { JoinRole } from '@ab/shared';
import { t } from '@/lib/i18n';
import { RoomButton } from '../RoomButton';
import type { RoomController } from '../use-room';
import { canShareScreen } from './media-support';
import type { ShareRequests } from './use-share-requests';

interface Props {
  room: RoomController;
  role: JoinRole;
  share: ShareRequests;
}

/**
 * «شارك الشاشة» where it can work: the browser has getDisplayMedia (never on phones) and LiveKit
 * lets this participant publish a screen (staff, or a guest after «سماح»). A guest who may not yet
 * gets «اطلب مشاركة الشاشة» instead; nobody gets a button that can only fail.
 */
export function ShareButton({ room, role, share }: Props) {
  const { snap } = room;
  if (!canShareScreen()) return null;
  if (snap.shareAllowed) {
    const label = snap.shareOn ? t.classroom.shareOff : t.classroom.shareOn;
    return <RoomButton icon="screen" on={snap.shareOn} label={label} onClick={room.toggleShare} />;
  }
  if (role !== 'guest') return null;
  const waiting = share.mine === 'pending';
  const label = waiting ? t.classroom.shareRequest.pending : t.classroom.shareRequest.request;
  return <RoomButton icon="hand" on={waiting} disabled={waiting} label={label} onClick={share.request} />;
}
