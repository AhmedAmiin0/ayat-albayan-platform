import { credentialsOf, type RoomTarget } from '@ab/mobile-kit/room';
import { Linking } from 'react-native';
import { portalSend } from '@/portal';
import type { RoomLink } from '@/room/room-way';

/** The lesson's room in the phone's browser: the signed /join link, as before the in-app room. */
export const openInBrowser = (link: RoomLink) => async () => {
  const { url } = await portalSend.roomLink(link);
  await Linking.openURL(url);
};

/** The join again from inside the room (a retry, or no token handed over by the press). */
export const joinFor = (link: RoomLink) => async (target: RoomTarget) =>
  credentialsOf(await portalSend.join({ studentId: link.studentId, lessonId: target.id }));
