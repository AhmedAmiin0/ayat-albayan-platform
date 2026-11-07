import type { PickState } from '@ab/client-core';
import { clockOf, wallParts, type Conflict } from '@ab/shared';
import type { ReactNode } from 'react';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { Button } from '@/components/ui/form/button';
import { conflictText } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { type Clock, useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

export interface RowNoticeProps {
  state: PickState;
  /** The nearest free starts that day (nearestFree): optional, each sets the row's time. */
  suggestions: readonly string[];
  /** The student's zone: the suggestions' times and the row's time are its wall clock. */
  tz: string;
  teacherTz: string | null;
  onUse: (time: string) => void;
}

type Ctx = RowNoticeProps & { clock: Clock & { tz: string } };

/** The nearest free times that day, each a button that takes it. */
function Suggestions({ ctx }: { ctx: Ctx }) {
  const { clock, suggestions, tz } = ctx;
  if (suggestions.length === 0) return null;
  return (
    <div role="group" aria-label={t.lessonTimes.nearest} className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-ink-2">{t.lessonTimes.nearest}</span>
      {suggestions.map((at) => (
        <Button
          key={at}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => ctx.onUse(wallParts(at, tz).time)}
        >
          {t.lessonTimes.useTime.replace('{time}', clockOf(new Date(at), { ...clock, tz }))}
        </Button>
      ))}
    </div>
  );
}

/** The grid's reasons (the conflict notice texts), then the nearest free times. */
function Clash({ ctx, conflicts }: { ctx: Ctx; conflicts: readonly Conflict[] }) {
  return (
    <div role="status" className="grid gap-1.5 rounded-md bg-danger-soft px-3 py-2 text-sm">
      <p className="flex items-center gap-1.5 font-semibold">
        <NuqtaGlyph shape="struck" className="text-danger" />
        {t.booking.conflictTitle}
      </p>
      {conflicts.map((c, i) => (
        <p key={`${c.kind}-${i}`}>{conflictText(c, ctx.clock, ctx.teacherTz ?? undefined)}</p>
      ))}
      <Suggestions ctx={ctx} />
    </div>
  );
}

/** The conflicts a state carries (busy: the grid's; outside: the availability one). */
const conflictsOf = (state: PickState): Conflict[] => {
  const of: Partial<Record<PickState['kind'], Conflict[]>> = {
    busy: state.kind === 'busy' ? state.conflicts : [],
    outside: state.kind === 'outside' ? [state.conflict] : [],
  };
  return of[state.kind] ?? [];
};

const LINES: Record<'free' | 'past' | 'unchecked', ReactNode> = {
  free: (
    <p className="flex items-center gap-1.5 text-xs text-ink-2">
      <NuqtaGlyph shape="fill" className="text-ok" />
      {t.lessonTimes.free}
    </p>
  ),
  past: (
    <p role="alert" className="text-xs text-danger">
      {t.lessonTimes.past}
    </p>
  ),
  unchecked: <p className="text-xs text-ink-2">{t.lessonTimes.unchecked}</p>,
};

const LINE_KINDS: ReadonlySet<PickState['kind']> = new Set(['free', 'past', 'unchecked']);
const isLine = (kind: PickState['kind']): kind is keyof typeof LINES => LINE_KINDS.has(kind);

/** What the slot data says of the row's picked time (pickState), before the series check. */
export function RowNotice(props: RowNoticeProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const { kind } = props.state;
  if (isLine(kind)) return LINES[kind];
  return <Clash ctx={{ ...props, clock }} conflicts={conflictsOf(props.state)} />;
}
