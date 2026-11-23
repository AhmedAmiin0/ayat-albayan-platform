import type { PortalLesson, PortalWayIn } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { Linking, Vibration } from 'react-native';
import { portalSend } from '#/portal/index.ts';
import { enterRoom, joinWay, useRoomsInApp, type JoinWay } from '#/room/index.ts';

// «ادخل الحلقة» (docs/50 §2, mirrors the web portal's LessonAction): a Meet lesson opens its own
// link; our classroom opens inside the app while settings.family_meetings_in_app is on (owner
// 2026-11-16), else in the phone's browser through a signed room link (no second sign-in).

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
