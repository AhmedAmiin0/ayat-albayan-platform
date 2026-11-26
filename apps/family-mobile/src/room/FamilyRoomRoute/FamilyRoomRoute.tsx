import { RoomNotice } from '@ab/mobile-kit/room';
import { t } from '@ab/mobile-kit';
import { back } from './family-room-route.helpers';
import { FamilyRoom } from './FamilyRoom';
import { useFamilyRoomRoute } from './use-family-room-route';

/**
 * app/room/[id]?student=…: a lesson's classroom inside the family app (the staff
 * room moved into the kit), read-only participants (no host powers). A bad link: the notice.
 */
export function FamilyRoomRoute() {
  const { link } = useFamilyRoomRoute();
  if (!link) {
    return <RoomNotice testID="room-unavailable" message={t.mobileRoom.missing} onBack={back} />;
  }
  return <FamilyRoom link={link} />;
}
