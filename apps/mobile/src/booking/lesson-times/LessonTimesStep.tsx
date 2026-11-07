import { weekBounds } from '@ab/client-core';
import { useState } from 'react';
import { View } from 'react-native';
import { useViewerClock } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from '@/core/ui/feedback/Note';
import { FormLabel } from '@/core/ui/form/FormLabel';
import { Button } from '@/core/ui/primitives/Button';
import { PicksList } from '@/booking/shared/PicksList';
import { useSlots } from '@/booking/shared/queries';
import { cityOf, slotWindow, windowStart } from '@/booking/shared/slots';
import {
  excludeParams,
  type SlotMulti,
  type SlotStepProps,
} from '@/booking/trial/components/SlotStep';
import { LessonTimeRow } from './LessonTimeRow';
import { rowsView } from './lesson-rows-view';
import { rowCheck } from './row-check';
import { useLessonRows } from './use-lesson-rows';

type Inherited = 'teacherId' | 'tz' | 'durationMin' | 'from' | 'exclude';

interface LessonTimesStepProps extends Pick<SlotStepProps, Inherited> {
  /** The course's first local day (YYYY-MM-DD in `tz`): the dates run from it for one week. */
  opens: string;
  /** The picks (one instant per weekday), the days a week when fixed, and «التالي». */
  multi: SlotMulti;
  /** Rows to begin with when the days a week are not fixed (the package's usual count). */
  startRows?: number;
}

/**
 * A weekly course's lesson times (owner 2026-11-07: «a date input and a time input»): per day
 * of the plan one date (the first lesson on that weekday, in the course's first week) and one
 * time in the student's zone, on Expo's native dialogs (rule 6, never typed). The slot data the
 * grid used (GET /booking/slots, same window and exclusions) tells each row free / busy / outside
 * availability with the nearest free times as suggestions; the review's series check stays the
 * gate.
 */
export function LessonTimesStep(props: LessonTimesStepProps) {
  const { teacherId, tz, durationMin, from, exclude, opens, multi } = props;
  const viewer = useViewerClock();
  const [now] = useState(() => new Date());
  const days = useLessonRows(multi, tz, props.startRows ?? 1);
  const window = slotWindow(windowStart(now, from));
  const slots = useSlots({ teacherId, ...window, durationMin, ...excludeParams(exclude) });
  const view = rowsView(days.rows, days.fixed, tz);
  const ctx = { tz, slots: slots.data, until: window.to, durationMin, now, viewer };
  return (
    <View style={{ gap: 12 }}>
      <FormLabel required>{t.lessonTimes.title}</FormLabel>
      <Note>{view.heading}</Note>
      <Note>{t.lessonTimes.intro.replace('{city}', cityOf(tz))}</Note>
      {slots.isError ? (
        <ErrorState message={t.booking.slotsError} onRetry={() => void slots.refetch()} />
      ) : null}
      {days.rows.map((row, index) => (
        <LessonTimeRow
          key={index}
          index={index}
          row={row}
          bounds={weekBounds(opens, days.rows)}
          repeated={view.repeated.includes(index)}
          check={rowCheck(row, ctx)}
          tz={tz}
          onChange={(patch) => days.change(index, patch)}
          onRemove={view.removable ? () => days.remove(index) : undefined}
        />
      ))}
      {view.canAdd ? <Button variant="secondary" label={t.lessonTimes.addDay} onPress={days.add} /> : null}
      <PicksList picks={view.picks} tz={tz} />
      {view.progress ? <Note>{view.progress}</Note> : null}
      <Button label={t.booking.next} disabled={!view.ready} onPress={multi.onNext} />
    </View>
  );
}
