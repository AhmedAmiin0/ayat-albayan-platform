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

/** Never the expiry line for a LiveKit failure, which sent the user round the same loop. */
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

/** Never a crash: a notice with an open-in-browser action where the room cannot start. */
export function RoomRoute() {
  // direct: from the lesson-started push, straight in; student: whose channel is the room chat.
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
