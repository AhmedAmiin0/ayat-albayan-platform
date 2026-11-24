import { router } from 'expo-router';
import { Linking } from 'react-native';
import { handOff, type RoomTarget, liveKitNative } from '@ab/mobile-kit/room';
import { roomRoute, roomWebUrl, type RoomEntry } from './join-target';
import { roomMode } from './room-mode';
import { joinAnswer, sendJoin } from './fetch-join';
import { usePublicConfig } from '@/core/lib/query/public-config';

/** settings.meetings_in_app (public, default on): rooms open inside the app (docs/35). */
export const useRoomsInApp = (): boolean => usePublicConfig().meetings_in_app;

/** A page sheet's slide-out: the room is pushed once it is gone. */
const SHEET_CLOSE_MS = 350;

interface OpenOptions extends RoomEntry {
  /**
   * The press sits in a page sheet (a Modal): it closes first, else Android keeps the Modal's
   * window above the new room screen.
   */
  closeSheet?: (() => void) | undefined;
}

const afterSheet = (): Promise<void> => new Promise((r) => setTimeout(r, SHEET_CLOSE_MS));

/**
 * «ادخل الحلقة» / «ادخل الاجتماع»: the join endpoint first, so a refusal reads where the button is
 * (it throws). Then the in-app room (the token handed over in memory), or the web page in the
 * browser when the setting is off, or LiveKit is missing or fails to load in this binary (never a
 * room screen that cannot start: it read «انتهت صلاحية الدخول» and sent the user round again).
 */
export async function openRoom(target: RoomTarget, inApp: boolean, options: OpenOptions = {}) {
  const answer = await sendJoin(target);
  if (roomMode(inApp, (await liveKitNative()) !== null) === 'browser') {
    await Linking.openURL(roomWebUrl(target));
    return;
  }
  handOff(target, joinAnswer(answer));
  if (options.closeSheet) {
    options.closeSheet();
    await afterSheet();
  }
  router.push(roomRoute(target, options));
}
