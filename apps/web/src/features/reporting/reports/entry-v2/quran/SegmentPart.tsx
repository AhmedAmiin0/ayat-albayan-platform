import { fillSlots, rangeLabel, rangeMeta } from '@ab/client-core';
import type { Grade, ReportSegment } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { GradeChips } from '../GradeChips';

export interface SegmentPartProps {
  /** Unique radio group name. */
  name: string;
  segment: ReportSegment;
  onPick: () => void;
  onGrade: (grade: Grade) => void;
  onRemove: () => void;
  invalid: boolean;
}

/** One surah part of a track: its range (opens the picker), meta, five grades and «احذف». */
export function SegmentPart({ name, segment, onPick, onGrade, onRemove, invalid }: SegmentPartProps) {
  const v2 = t.reports.v2;
  return (
    <div className="grid gap-2 border-t border-rule pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="secondary" onClick={onPick}>
          {rangeLabel(segment, { words: v2, lang: locale })}
        </Button>
        <span className="text-xs text-ink-3">{rangeMeta(segment, v2)}</span>
      </div>
      <GradeChips
        name={name}
        label={fillSlots(v2.rateOf, { title: v2.segment[segment.kind] })}
        value={segment.grade}
        onChange={onGrade}
        invalid={invalid}
      />
      <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={onRemove}>
        {v2.removeSegment}
      </Button>
    </div>
  );
}
