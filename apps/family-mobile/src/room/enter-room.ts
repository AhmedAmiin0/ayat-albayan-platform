import { router } from 'expo-router';
import { handOff } from '@ab/mobile-kit/room';
import { portalSend } from '@/portal';
import { roomHref, type RoomLink } from './room-way';

/** Join first so a refusal shows under the button; the token is handed to the room in memory. */
export async function enterRoom(link: RoomLink): Promise<void> {
  const answer = await portalSend.join({ studentId: link.studentId, lessonId: link.lessonId });
  handOff({ kind: 'lesson', id: link.lessonId }, answer);
  router.push(roomHref(link));
}
