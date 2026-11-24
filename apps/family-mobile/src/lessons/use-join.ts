import type { PortalLesson, PortalWayIn } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { Linking, Vibration } from 'react-native';
import { portalSend } from '@/portal';
import { enterRoom, joinWay, useRoomsInApp, type JoinWay } from '@/room';

// Classroom opens in-app while family_meetings_in_app is on, else a signed browser link.

/** A light tap under the finger (React Native's own vibration: no native module to ship). */
const HAPTIC_MS = 12;

type UrlOf = (lesson: PortalLesson, studentId: string) => Promise<string>;

class NoWayIn extends Error {}

const URL_OF: Record<PortalWayIn, UrlOf> = {
  external: async (lesson) => lesson.meeting_url ?? Promise.reject(new NoWayIn()),
  classroom: async (lesson, studentId) =>
    (await portalSend.roomLink({ studentId, lessonId: lesson.id })).url,
  none: async () => Promise.reject(new NoWayIn()),
};

type Enter = (lesson: PortalLesson, studentId: string) => Promise<void>;

const ENTER: Record<JoinWay, Enter> = {
  room: (lesson, studentId) => enterRoom({ studentId, lessonId: lesson.id }),
  link: async (lesson, studentId) => {
    await Linking.openURL(await URL_OF[lesson.way_in](lesson, studentId));
  },
};

/** Opens the lesson: the in-app room, or the browser (or the Meet app); `error` when it failed. */
export function useJoin(studentId: string) {
  const inApp = useRoomsInApp();
  return useMutation({
    onMutate: () => Vibration.vibrate(HAPTIC_MS),
    mutationFn: (lesson: PortalLesson) => ENTER[joinWay(lesson.way_in, inApp)](lesson, studentId),
  });
}
