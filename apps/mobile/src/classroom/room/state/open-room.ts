import type { RoomJoinResult } from '@ab/shared';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { handOff } from '@/classroom/room/model/join-handoff';
import { joinPath, roomRoute, roomWebUrl } from '@/classroom/room/model/join-target';
import { roomMode } from '@/classroom/room/model/room-mode';
import type { RoomTarget } from '@/classroom/room/model/room-types';
import { nativeRoomAvailable } from '@/classroom/room/native/livekit-native';
import { apiSend } from '@/core/lib/http/api';
import { usePublicConfig } from '@/core/lib/query/public-config';

/** settings.meetings_in_app (public, default on): rooms open inside the app (docs/35). */
export const useRoomsInApp = (): boolean => usePublicConfig().meetings_in_app;

/**
 * «ادخل الحلقة» / «ادخل الاجتماع»: the join endpoint first, so a refusal reads where the button is
 * (it throws). Then the in-app room (the token handed over in memory), or the web page in the
 * browser when the setting is off or this binary has no LiveKit.
 */
export async function openRoom(target: RoomTarget, inApp: boolean): Promise<void> {
  const join = await apiSend<RoomJoinResult>('POST', joinPath(target));
  if (roomMode(inApp, nativeRoomAvailable()) === 'app') {
    handOff(target, join);
    router.push(roomRoute(target));
    return;
  }
  await Linking.openURL(roomWebUrl(target));
}
