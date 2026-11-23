import { familyMeetingsOn } from '@ab/client-core';
import { PUBLIC_CONFIG_QUERY_KEY } from '@ab/settings';
import { liveKitNative } from '@ab/mobile-kit/room';
import { queryClient, usePublicConfig } from '@ab/mobile-kit';

/** This binary carries LiveKit (an older APK opens rooms in the browser). */
const hasNativeRoom = (): boolean => liveKitNative() !== null;

/** settings.family_meetings_in_app and LiveKit here: lessons open inside the app. */
export const useRoomsInApp = (): boolean =>
  familyMeetingsOn(usePublicConfig()) && hasNativeRoom();

/** The same, read at a push's tap (outside React): the cached settings; unknown = off. */
export const roomsInAppNow = (): boolean =>
  familyMeetingsOn(queryClient.getQueryData(PUBLIC_CONFIG_QUERY_KEY)) && hasNativeRoom();
