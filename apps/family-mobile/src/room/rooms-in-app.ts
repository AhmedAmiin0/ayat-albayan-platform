import { familyMeetingsOn } from '@ab/client-core';
import { PUBLIC_CONFIG_QUERY_KEY } from '@ab/settings';
import { nativeRoomQuery, useNativeRoom } from '@ab/mobile-kit/room';
import { queryClient, usePublicConfig } from '@ab/mobile-kit';

/**
 * settings.family_meetings_in_app and LiveKit in this binary (an older APK opens rooms in the
 * browser): lessons open inside the app. False while LiveKit is still loading.
 */
export function useRoomsInApp(): boolean {
  const on = familyMeetingsOn(usePublicConfig());
  const native = useNativeRoom().data;
  return on && native != null;
}

/** The same, read at a push's tap (outside React): the cached settings; unknown = off. */
export async function roomsInAppNow(): Promise<boolean> {
  const on = familyMeetingsOn(queryClient.getQueryData(PUBLIC_CONFIG_QUERY_KEY));
  return on && (await queryClient.query(nativeRoomQuery)) !== null;
}
