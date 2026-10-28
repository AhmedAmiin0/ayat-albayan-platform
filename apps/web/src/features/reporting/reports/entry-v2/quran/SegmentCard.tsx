import { MAX_SEGMENTS, segmentsOf, withSegment, type ReportContent, type SegmentKind } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import type { ReportEntryV2State } from '../use-report-entry-v2';
import { CARD, CARD_TITLE } from '../v2-classes';
import { SegmentPart } from './SegmentPart';

export interface SegmentCardProps {
  s: ReportEntryV2State;
  kind: SegmentKind;
  /** Open the picker on a part (index) or a new one (-1). */
  onPick: (index: number) => void;
}

const gradeAt = (index: number, grade: ReportContent['segments'][number]['grade']) => (c: ReportContent) => {
  const part = c.segments[index];
  return part ? withSegment(c, { index, segment: { ...part, grade } }) : c;
};

/** One track (التسميع / الحفظ الجديد / المراجعة): its parts, or «اختر السورة والآيات» while empty. */
export function SegmentCard({ s, kind, onPick }: SegmentCardProps) {
  const v2 = t.reports.v2;
  const { content } = s.values;
  const parts = segmentsOf(content, kind);
  const room = content.segments.length < MAX_SEGMENTS;
  const missing = s.problem === 'missing_segments';
  return (
    <section aria-label={v2.segment[kind]} className={CARD}>
      <h3 className={CARD_TITLE}>{v2.segment[kind]}</h3>
      {parts.map(({ segment, index }) => (
        <SegmentPart
          key={index}
          name={`${s.report.id}-${kind}-${index}`}
          segment={segment}
          onPick={() => onPick(index)}
          onGrade={(g) => s.setContent(gradeAt(index, g))}
          onRemove={() => s.setContent((c) => withSegment(c, { index, segment: null }))}
          invalid={s.problem === 'missing_grades'}
        />
      ))}
      {parts.length === 0 ? (
        <Button type="button" variant="secondary" className="justify-self-start" aria-invalid={missing || undefined} onClick={() => onPick(-1)}>
          {v2.pickRange}
        </Button>
      ) : (
        room && (
          <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => onPick(-1)}>
            {v2.addSegment}
          </Button>
        )
      )}
    </section>
  );
}
