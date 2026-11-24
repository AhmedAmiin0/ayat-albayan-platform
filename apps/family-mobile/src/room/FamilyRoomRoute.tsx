import {
  credentialsOf,
  RoomNotice,
  RoomScreen,
  useNativeRoom,
  type BackSource,
  type RoomTarget,
} from '@ab/mobile-kit/room';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Linking } from 'react-native';
import { t } from '@ab/mobile-kit';
import { portalSend, useChildLessons } from '@/portal';
import { parseRoomParams, type RoomLink } from './room-way';
import { useFamilyRoomChat } from './use-family-room-chat';

const back = () => {
  if (router.canGoBack()) router.back();
};

/** The lesson's room in the phone's browser: the signed /join link, as before the in-app room. */
const openInBrowser = (link: RoomLink) => async () => {
  const { url } = await portalSend.roomLink(link);
  await Linking.openURL(url);
};

/** The join again from inside the room (a retry, or no token handed over by the press). */
const joinFor = (link: RoomLink) => async (target: RoomTarget) =>
  credentialsOf(await portalSend.join({ studentId: link.studentId, lessonId: target.id }));

/** Who the lesson says is inside (its `room.inRoom`), from the child's lessons read. */
function usePresence({ studentId, lessonId }: RoomLink) {
  const lessons = useChildLessons(studentId).data?.lessons ?? [];
  return lessons.find((l) => l.id === lessonId)?.room?.inRoom ?? [];
}

/** The room screen for one checked link: the device's LiveKit, the channel, the browser. */
function FamilyRoom({ link }: { link: Required<RoomLink> }) {
  const native = useNativeRoom();
  const chat = useFamilyRoomChat(link.studentId);
  const presence = usePresence(link);
  const navigation = useNavigation();
  const backSource: BackSource = (listener) => navigation.addListener('beforeRemove', listener);
  const browser = openInBrowser(link);
  const platform = native.data;
  if (native.isPending) {
    return <RoomNotice testID="room-loading" message={t.mobileRoom.connecting} busy />;
  }
  if (!platform) {
    const again = { label: t.mobileRoom.openInBrowser, onPress: () => void browser().then(back) };
    const message = t.mobileRoom.sdkFailed;
    return <RoomNotice testID="room-sdk-failed" message={message} again={again} onBack={back} />;
  }
  return (
    <RoomScreen
      platform={platform}
      target={{ kind: 'lesson', id: link.lessonId }}
      fetchJoin={joinFor(link)}
      onExit={back}
      rememberChoice
      direct={link.direct}
      presence={presence}
      chat={chat}
      onBrowser={() => void browser()}
      backSource={backSource}
    />
  );
}

/**
 * app/room/[id]?student=…: a lesson's classroom inside the family app (owner 2026-11-16, the staff
 * room moved into the kit), read-only participants (no host powers). A bad link: the notice.
 */
export function FamilyRoomRoute() {
  const link = parseRoomParams(useLocalSearchParams());
  if (!link) {
    return <RoomNotice testID="room-unavailable" message={t.mobileRoom.missing} onBack={back} />;
  }
  return <FamilyRoom link={link} />;
}
