import { router } from 'expo-router';
import { handOff } from '@ab/mobile-kit/room';
import { portalSend } from '#/portal/index.ts';
import { roomHref, type RoomLink } from './room-way';

/**
 * «ادخل الحلقة» inside the app: the join first, so a refusal (outside the window, ended for
 * everyone) reads under the button; the token handed to the room in memory, then the room.
 */
export async function enterRoom(link: RoomLink): Promise<void> {
  const answer = await portalSend.join({ studentId: link.studentId, lessonId: link.lessonId });
  handOff({ kind: 'lesson', id: link.lessonId }, answer);
  router.push(roomHref(link));
}
