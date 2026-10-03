import { isOpenLesson, joinWindow, type LessonView } from '@ab/shared';
import { useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/ui/Button';
import { joinError, opensAtLine } from './join-text';
import { useMinuteClock } from './use-minute-clock';
import { classroomUrl } from './web-origin';

const text = t.classroom;

/**
 * «ادخل الحلقة» on a lesson row (teacher and admin): live from 15 minutes before the start until 2
 * hours after the end (re-checked every minute), else off with «بتفتح الساعة …». A press asks the
 * API first (POST /lessons/:id/room/join) so a refusal reads in the app, and only on success opens the
 * web classroom in the system browser (no native WebRTC here: the web page mints its own token).
 */
export function JoinClassroomButton({ lesson }: { lesson: LessonView }) {
  const now = useMinuteClock();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  if (!isOpenLesson(lesson.status)) return null;
  const win = joinWindow(lesson, now);
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
  const hint =
    win.state === 'early' ? opensAtLine(win.opens_at) : win.state === 'closed' ? text.closedHint : null;
  return (
    <View style={{ gap: 2, alignSelf: 'flex-start' }}>
      <Button
        label={busy ? text.joining : text.enter}
        accessibilityLabel={text.enter}
        busy={busy}
        disabled={win.state !== 'open'}
        onPress={join}
      />
      {hint ? <Note>{hint}</Note> : null}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
