import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { opensAtLine } from './join-text';
import { type JoinableLesson, useJoinClassroom } from './use-join-classroom';

export type { JoinableLesson } from './use-join-classroom';

const text = t.classroom;

/**
 * «ادخل الحلقة» on a lesson row (teacher and admin): live inside the settings' join window (15 minutes
 * before the start to 2 hours after the end by default) (re-checked every minute), else off with
 * «بتفتح الساعة …». The press is useJoinClassroom's: the API first, then the web classroom. Full width like
 * the sheet's other main buttons: shrink-wrapped, Android drew «Join the lesson» wider than it was
 * measured and clipped it to «Join the» (owner screenshots 2026-10-28).
 */
export function JoinClassroomButton({ lesson }: { lesson: JoinableLesson }) {
  const { win, busy, error, join } = useJoinClassroom(lesson);
  const cycle = useClockCycle();
  if (!win) return null;
  const hint =
    win.state === 'early' ? opensAtLine(win.opens_at, cycle) : win.state === 'closed' ? text.closedHint : null;
  return (
    <View testID="join-classroom" style={{ gap: 2, alignSelf: 'stretch' }}>
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
