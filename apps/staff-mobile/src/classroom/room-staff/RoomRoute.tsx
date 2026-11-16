import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';
import { parseTarget, roomWebUrl } from '@/classroom/room/model/join-target';
import type { RoomTarget } from '@/classroom/room/model/room-types';
import { nativeRoomPlatform } from '@/classroom/room/native/native-platform';
import { RoomNotice } from '@/classroom/room/screen/RoomNotice';
import { RoomScreen } from '@/classroom/room/screen/RoomScreen';
import { t } from '@ab/mobile-kit';
import { staffHost } from './staff-host';
import { useRoomChat } from './use-room-chat';

const back = () => {
  if (router.canGoBack()) router.back();
};

/**
 * The route's params: kind, id; `direct` (from the «بدأت الحلقة» push: straight in, the
 * microphone on); `student` (the lesson's student: the in-room «المحادثة»).
 */
type RoomParams = { kind?: string; id?: string; direct?: string; student?: string };

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
  const params = useLocalSearchParams<RoomParams>();
  const target = parseTarget(params.kind, params.id);
  const [platform] = useState(nativeRoomPlatform);
  const chat = useRoomChat(params.student ?? null);
  if (!target || !platform) return <RoomUnavailable target={target} />;
  return (
    <RoomScreen
      platform={platform}
      target={target}
      onExit={back}
      direct={params.direct === '1'}
      host={staffHost(target)}
      chat={chat}
    />
  );
}
