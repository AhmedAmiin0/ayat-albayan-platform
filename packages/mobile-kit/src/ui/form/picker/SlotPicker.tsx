import { localDateIn } from '@ab/shared';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { whenText, type ViewerClock } from '../../../lib/time/slots/slot-text';
import { weekLabel } from '../../../lib/time/slots/week';
import { type, useTheme } from '../../../theme';
import { ErrorState } from '../../feedback/ErrorState';
import { AppText } from '../../primitives/AppText';
import { PeriodSwitcher } from './PeriodSwitcher';
import type { SlotWeek } from './use-slot-week';
import { WeekSlots, type WeekSlotsProps } from './WeekSlots';

/** The week's slot read (a TanStack query of the caller's slots route). */
export interface SlotsRead {
  data: WeekSlotsProps['slots'] | undefined;
  isError: boolean;
  refetch: () => unknown;
}

export interface SlotPickerProps {
  /** useSlotWeek: the shown week and its ‹ ›. */
  week: SlotWeek;
  slots: SlotsRead;
  /** The student's zone: the small clocks. */
  tz: string;
  /** The viewer's zone and cycle: staff their own, the family the student's clock. */
  viewer: ViewerClock;
  /** starts_at of the picked slot. */
  value: string | null;
  onPick: (startsAt: string) => void;
  /** Only days from this local date (`tz`) on. */
  notBefore?: string;
}

/** R-SCH-07: only clash-free slots are offered and nothing is typed (rule 6). */
export function SlotPicker(props: SlotPickerProps) {
  const { week, tz, viewer, value } = props;
  const note = useNoteStyle();
  const picked = value && t.booking.picked.replace('{when}', whenText(value, tz, viewer));
  return (
    <View style={{ gap: 10 }}>
      <PeriodSwitcher
        label={weekLabel(week.week)}
        current={week.week === week.thisWeek}
        canPrev={week.week > week.thisWeek}
        prevLabel={t.schedule.prevWeek}
        nextLabel={t.schedule.nextWeek}
        onPrev={week.prev}
        onNext={week.next}
        onToday={week.today}
      />
      <SlotsBody {...props} />
      <AppText accessibilityLiveRegion="polite" style={note}>
        {picked || t.lessons.newTimeHint}
      </AppText>
    </View>
  );
}

function useNoteStyle() {
  const { color } = useTheme();
  const size = type.size.sm;
  const lineHeight = type.lineHeight(size);
  return { fontFamily: type.ui[500], fontSize: size, lineHeight, color: color.ink2 };
}

type BodyState = 'error' | 'loading' | 'ready';

const stateOf = (slots: SlotsRead): BodyState => {
  if (slots.isError) return 'error';
  return slots.data ? 'ready' : 'loading';
};

function SlotsBody({ slots, tz, viewer, value, onPick, notBefore = '' }: SlotPickerProps) {
  const note = useNoteStyle();
  const shown = (slots.data ?? []).filter(
    (s) => localDateIn(new Date(s.starts_at), tz) >= notBefore,
  );
  const states: Record<BodyState, () => ReactElement> = {
    error: () => <ErrorState message={t.booking.slotsError} onRetry={() => void slots.refetch()} />,
    loading: () => <AppText style={note}>{t.common.loading}</AppText>,
    ready: () => <WeekSlots slots={shown} tz={tz} viewer={viewer} value={value} onPick={onPick} />,
  };
  return states[stateOf(slots)]();
}
