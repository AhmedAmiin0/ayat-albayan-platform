import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { opensAtLine } from './join-text';
import { type JoinableLesson, useJoinClassroom } from './use-join-classroom';

export type { JoinableLesson } from './use-join-classroom';

const text = t.classroom;

interface JoinClassroomButtonProps {
  lesson: JoinableLesson;
  /**
   * A sheet puts the live button on top (its one primary) and the waiting one under the other actions:
   * it renders the first with `open` and the second with `waiting`. Unset = either, in place.
   */
  only?: 'open' | 'waiting';
}

/**
 * «ادخل الحلقة» on a lesson row (teacher and admin): live inside the settings' join window (15 minutes
 * before the start to 2 hours after the end by default) (re-checked every minute), else off with
 * «بتفتح الساعة …». The press is useJoinClassroom's: the API first, then the web classroom. Full width like
 * the sheet's other main buttons. The full-width wrapper alone did not stop «Join the» (owner
 * screenshots 2026-10-28 and 10-29): the fix is in Button, whose label box spans the button and keeps
 * Android's «…» (no adjustsFontSizeToFit). Filled only while it is live;
 * waiting (early, closed) it is an outlined, disabled secondary, so it never sits as a second filled
 * button beside «تأكيد» (docs/07 §6 «الأزرار»).
 */
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

/**
 * A lesson's actions with «ادخل الحلقة» around them: on top while it is live (the one primary), under
 * them while it waits (an outlined, disabled hint), so the filled button always leads (docs/07 §6).
 */
export function JoinAround({ lesson, children }: { lesson: JoinableLesson; children: ReactNode }) {
  return (
    <>
      <JoinClassroomButton lesson={lesson} only="open" />
      {children}
      <JoinClassroomButton lesson={lesson} only="waiting" />
    </>
  );
}
