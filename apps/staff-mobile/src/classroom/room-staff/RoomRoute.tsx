import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Linking } from 'react-native';
import { parseTarget, roomWebUrl } from './join-target';
import {
  type BackSource,
  RoomNotice,
  RoomScreen,
  type RoomTarget,
  useNativeRoom,
} from '@ab/mobile-kit/room';
import { t } from '@ab/mobile-kit';
import { fetchJoin } from './fetch-join';
import { staffHost } from './staff-host';
import { useRoomChat } from './use-room-chat';

const back = () => {
  if (router.canGoBack()) router.back();
};

/**
 * No room screen: a bad or stale link («انتهت صلاحية الدخول»), or LiveKit missing or failing to
 * load in this binary (its own words, and the browser: never the expiry line, which sent the user
 * round the same loop).
 */
function RoomUnavailable({ target }: { target: RoomTarget | null }) {
  const browser = target
    ? {
        label: t.mobileRoom.openInBrowser,
        onPress: () => void Linking.openURL(roomWebUrl(target)).then(back),
      }
    : undefined;
  return (
    <RoomNotice
      testID={target ? 'room-sdk-failed' : 'room-unavailable'}
      message={target ? t.mobileRoom.sdkFailed : t.mobileRoom.missing}
      again={browser}
      onBack={back}
    />
  );
}

/**
 * app/room/[kind]/[id]: the room screen with the device's LiveKit, the staff's host powers and
 * the student channel. Never a crash: a notice with «فتح في المتصفح» where the room cannot start.
 */
export function RoomRoute() {
  // `direct`: from the «بدأت الحلقة» push (straight in, the microphone on); `student`: the
  // lesson's student, whose channel is the in-room «المحادثة».
  const params = useLocalSearchParams<{
    kind?: string;
    id?: string;
    direct?: string;
    student?: string;
  }>();
  const target = parseTarget(params.kind, params.id);
  const native = useNativeRoom();
  const chat = useRoomChat(params.student ?? null);
  const navigation = useNavigation();
  const backSource: BackSource = (listener) => navigation.addListener('beforeRemove', listener);
  const platform = native.data;
  if (target && native.isPending) {
    return <RoomNotice testID="room-loading" message={t.mobileRoom.connecting} busy />;
  }
  if (!target || !platform) return <RoomUnavailable target={target} />;
  return (
    <RoomScreen
      platform={platform}
      target={target}
      onExit={back}
      direct={params.direct === '1'}
      host={staffHost(target)}
      chat={chat}
      backSource={backSource}
      fetchJoin={fetchJoin}
      onBrowser={() => void Linking.openURL(roomWebUrl(target))}
    />
  );
}
