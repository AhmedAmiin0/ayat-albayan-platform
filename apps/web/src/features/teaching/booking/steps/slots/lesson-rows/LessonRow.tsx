import { lessonAt, type LessonRow as Row } from '@ab/client-core';
import type { SlotsResponse } from '@ab/shared';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';
import { LessonRowFields } from './LessonRowFields';
import { RowNotice } from './RowNotice';
import { rowCheck } from './row-state';
import { besideText, type RowBounds } from './row-window';

/** What every row shares: the family's zone, the length, the slot data and the date bounds. */
export interface RowsCtx {
  tz: string;
  durationMin: number;
  now: Date;
  data: SlotsResponse | undefined;
  teacherTz: string | null;
  bounds: RowBounds;
}

export interface LessonRowProps {
  at: { index: number; row: Row; error: string | undefined };
  ctx: RowsCtx;
  on: { change: (patch: Partial<Row>) => void; remove: (() => void) | undefined };
}

/** One lesson day: its inputs, the clocks beside its time and what the slot data says of it. */
export function LessonRow({ at, ctx, on }: LessonRowProps) {
  const clock = useClock();
  const viewerTz = useViewerTz();
  const { tz, teacherTz } = ctx;
  const instant = lessonAt(at.row, tz);
  const check = rowCheck(at.row, ctx.data, ctx);
  const zones = { studentTz: tz, viewerTz, teacherTz };
  return (
    <LessonRowFields
      index={at.index}
      row={at.row}
      bounds={ctx.bounds}
      onChange={on.change}
      onRemove={on.remove}
      dateError={at.error}
      beside={instant === null ? '' : besideText(instant, zones, clock)}
    >
      {check && (
        <RowNotice
          state={check.state}
          suggestions={check.suggestions}
          tz={tz}
          teacherTz={teacherTz}
          onUse={(time) => on.change({ time })}
        />
      )}
    </LessonRowFields>
  );
}
