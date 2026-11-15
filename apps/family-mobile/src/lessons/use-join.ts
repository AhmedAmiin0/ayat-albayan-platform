import type { PortalLesson, PortalWayIn } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { Linking, Vibration } from 'react-native';
import { portalSend } from '@/portal';

// «ادخل الحلقة» (docs/50 §2, mirrors the web portal's LessonAction): a Meet lesson opens its own
// link; our classroom opens in the phone's browser through a signed room link (no LiveKit inside
// the app, docs/50 §7, and no second sign-in).

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

/** Opens the lesson in the browser (or the Meet app); `error` when it could not be had. */
export function useJoin(studentId: string) {
  return useMutation({
    onMutate: () => Vibration.vibrate(HAPTIC_MS),
    mutationFn: async (lesson: PortalLesson) => {
      await Linking.openURL(await URL_OF[lesson.way_in](lesson, studentId));
    },
  });
}
