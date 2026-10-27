import { isOpenLesson, joinWindow, type LessonView } from '@ab/shared';
import { useRef, useState } from 'react';
import { Linking } from 'react-native';
import { apiSend } from '@/core/lib/http/api';
import { useJoinWindow } from '@/core/lib/query/public-config';
import { joinError } from './join-text';
import { useNow } from '@/core/lib/time/use-now';
import { classroomUrl } from './web-origin';

/** What joining needs of a lesson (an assistant's session has no more than this). */
export type JoinableLesson = Pick<LessonView, 'id' | 'status' | 'starts_at' | 'ends_at' | 'room_opened_at'>;

/**
 * «ادخل الحلقة»: the join window (re-checked every minute) and the press. A press asks the API first
 * (POST /lessons/:id/room/join) so a refusal reads in the app, and only on success opens the web
 * classroom in the system browser (no native WebRTC here: the web page mints its own token).
 * `win` is null for a lesson that is no longer open.
 */
export function useJoinClassroom(lesson: JoinableLesson) {
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const config = useJoinWindow();
  const win = isOpenLesson(lesson.status) ? joinWindow(lesson, now, config) : null;
  const join = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await apiSend('POST', `/lessons/${lesson.id}/room/join`);
      await Linking.openURL(classroomUrl(lesson.id));
    } catch (e) {
      setError(joinError(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return { win, busy, error, join };
}
