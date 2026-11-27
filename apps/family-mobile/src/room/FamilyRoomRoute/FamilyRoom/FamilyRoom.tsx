import { RoomNotice, RoomScreen } from '@ab/mobile-kit/room';
import { t } from '@ab/mobile-kit';
import { back } from '@/room/FamilyRoomRoute/family-room-route.helpers';
import type { FamilyRoomProps } from './FamilyRoom.types';
import { useFamilyRoom } from './use-family-room';

/** The room screen for one checked link: the device's LiveKit, the channel, the browser. */
export function FamilyRoom({ link }: FamilyRoomProps) {
  const room = useFamilyRoom({ link });
  if (room.native.isPending) {
    return <RoomNotice testID="room-loading" message={t.mobileRoom.connecting} busy />;
  }
  if (!room.native.data) {
    return (
      <RoomNotice
        testID="room-sdk-failed"
        message={t.mobileRoom.sdkFailed}
        again={room.again}
        onBack={back}
      />
    );
  }
  return (
    <RoomScreen
      platform={room.native.data}
      target={{ kind: 'lesson', id: link.lessonId }}
      fetchJoin={room.fetchJoin}
      onExit={back}
      rememberChoice
      direct={link.direct}
      presence={room.presence}
      chat={room.chat}
      onBrowser={room.onBrowser}
      backSource={room.backSource}
    />
  );
}
