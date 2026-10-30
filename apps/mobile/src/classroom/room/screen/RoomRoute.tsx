import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';
import { parseTarget, roomWebUrl } from '@/classroom/room/model/join-target';
import { nativeRoomPlatform } from '@/classroom/room/native/native-platform';
import { t } from '@/core/lib/i18n/i18n';
import { RoomNotice } from './RoomNotice';
import { RoomScreen } from './RoomScreen';

const back = () => {
  if (router.canGoBack()) router.back();
};

/**
 * app/room/[kind]/[id]: the room screen with the device's LiveKit. A binary without it (or a bad
 * link) gets a notice with «فتح في المتصفح», never a crash.
 */
export function RoomRoute() {
  const params = useLocalSearchParams<{ kind?: string; id?: string }>();
  const target = parseTarget(params.kind, params.id);
  const [platform] = useState(nativeRoomPlatform);
  if (target && platform) return <RoomScreen platform={platform} target={target} onExit={back} />;
  const browser = target
    ? {
        label: t.mobileRoom.openInBrowser,
        onPress: () => void Linking.openURL(roomWebUrl(target)).then(back),
      }
    : undefined;
  return (
    <RoomNotice
      testID="room-unavailable"
      message={t.mobileRoom.missing}
      again={browser}
      onBack={back}
    />
  );
}
