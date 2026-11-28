import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { opensAtLine } from '@/classroom/links/join-text';
import { type JoinableLesson, useJoinClassroom } from '@/classroom/links/use-join-classroom';

export type { JoinableLesson } from '@/classroom/links/use-join-classroom';

const text = t.classroom;

interface JoinClassroomButtonProps {
  lesson: JoinableLesson;
  /**
   * A sheet puts the live button on top (its one primary), the waiting one under the others:
   * it renders the first with `open` and the second with `waiting`. Unset = either, in place.
   */
  only?: 'open' | 'waiting';
}

/** Filled only while live so it never sits beside a filled confirm (docs/07 §6). */
export function JoinClassroomButton({ lesson, only }: JoinClassroomButtonProps) {
  const { win, busy, error, join } = useJoinClassroom(lesson);
  const cycle = useClockCycle();
  const tz = useViewerTz();
  if (!win) return null;
  const live = win.state === 'open';
  if ((only === 'open' && !live) || (only === 'waiting' && live)) return null;
  const early = win.state === 'early' ? opensAtLine(win.opens_at, cycle, tz) : null;
  const hint = early ?? (win.state === 'closed' ? text.closedHint : null);
  return (
    <View testID="join-classroom" style={{ gap: 2, alignSelf: 'stretch' }}>
      <Button
        label={busy ? text.joining : text.enter}
        accessibilityLabel={text.enter}
        variant={live ? 'primary' : 'secondary'}
        busy={busy}
        disabled={!live}
        onPress={join}
      />
      {hint ? <Note>{hint}</Note> : null}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}

/** On top while live, under while waiting, so the filled button always leads (docs/07 §6). */
export function JoinAround({ lesson, children }: { lesson: JoinableLesson; children: ReactNode }) {
  return (
    <>
      <JoinClassroomButton lesson={lesson} only="open" />
      {children}
      <JoinClassroomButton lesson={lesson} only="waiting" />
    </>
  );
}
