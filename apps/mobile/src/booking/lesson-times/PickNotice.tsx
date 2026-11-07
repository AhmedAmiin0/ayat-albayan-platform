import type { PickState } from '@ab/client-core';
import { wallParts, type Conflict } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Note } from '@/core/ui/feedback/Note';
import { AppText } from '@/core/ui/primitives/AppText';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import { conflictLine } from '@/booking/shared/booking-errors';
import { ConflictNotice } from '@/booking/shared/ConflictNotice';
import { SlotButton } from '@/teaching';
import { type, useTheme } from '@/theme';

interface PickNoticeProps {
  state: PickState;
  /** Free grid starts near the picked time (nearestFree): optional, a tap uses one. */
  nearest: readonly string[];
  /** The student's zone: a suggestion becomes that row's «HH:MM» there. */
  tz: string;
  onUse: (time: string) => void;
}

type Lines = (state: PickState) => string[];

/** The clashes a state carries: a busy start's, or the one outside the availability. */
function conflictsOf(s: PickState): Conflict[] {
  if (s.kind === 'busy') return s.conflicts;
  return s.kind === 'outside' ? [s.conflict] : [];
}

function Free() {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <NuqtaGlyph shape="fill" color={color.ok} size={10} />
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 }}>
        {t.lessonTimes.free}
      </AppText>
    </View>
  );
}

/** The grid's answer for one picked time: the same notice the slot grid and the review use. */
function StateLine({ state, lines }: { state: PickState; lines: Lines }) {
  const views: Record<PickState['kind'], () => ReactNode> = {
    free: () => <Free />,
    busy: () => <ConflictNotice lines={lines(state)} />,
    outside: () => <ConflictNotice lines={lines(state)} />,
    past: () => <ErrorLine message={t.lessonTimes.past} />,
    unchecked: () => <Note>{t.lessonTimes.unchecked}</Note>,
  };
  return <>{views[state.kind]()}</>;
}

/**
 * Under a lesson row (R-SCH-04): free, the conflict notice (busy or outside the teacher's
 * availability), past, or left to the series check; with the nearest free times of that day as
 * optional suggestions, in the slot grid's buttons (the viewer's time, the student's beside it).
 */
export function PickNotice({ state, nearest, tz, onUse }: PickNoticeProps) {
  const cycle = useClockCycle();
  const viewerTz = useViewerTz();
  const lines: Lines = (s) => conflictsOf(s).map((c) => conflictLine(c, cycle, viewerTz));
  return (
    <View style={{ gap: 8 }}>
      <StateLine state={state} lines={lines} />
      {nearest.length > 0 ? <Note>{t.lessonTimes.nearest}</Note> : null}
      {nearest.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {nearest.map((at) => (
            <SlotButton
              key={at}
              startsAt={at}
              tz={tz}
              role="button"
              selected={false}
              onPick={(slot) => onUse(wallParts(slot, tz).time)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
