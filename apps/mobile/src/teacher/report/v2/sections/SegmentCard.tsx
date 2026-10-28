import { MAX_SEGMENTS, segmentsOf, type ReportSegment, type SegmentKind } from '@ab/shared';
import { rangeLabel, rangeMeta } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { Button } from '@/core/ui/primitives/Button';
import { Note } from '@/more';
import { gradePart } from '../hooks/content-edit';
import type { V2EntryState } from '../hooks/use-v2-entry';
import { Card } from '../ui/Card';
import { GradePills } from '../ui/GradePills';
import { RangeButton } from '../ui/RangeButton';

interface SegmentCardProps {
  s: V2EntryState;
  kind: SegmentKind;
  /** Opens the picker on a part (its index in content.segments) or a new one (-1). */
  onOpen: (index: number) => void;
}

interface PartProps extends SegmentCardProps {
  segment: ReportSegment | null;
  index: number;
  /** A later part of the track: its own meta line under the first. */
  later: boolean;
}

function Part({ s, kind, onOpen, segment, index, later }: PartProps) {
  const v2 = t.reports.v2;
  const title = v2.segment[kind];
  return (
    <View style={{ gap: 8 }}>
      {later && segment ? <Note>{rangeMeta(segment, v2)}</Note> : null}
      <RangeButton
        label={segment ? rangeLabel(segment, { words: v2, lang: locale }) : v2.pickRange}
        onPress={() => onOpen(index)}
        disabled={s.locked}
      />
      <GradePills
        title={title}
        value={segment?.grade ?? null}
        onChange={(grade) => s.edit((c) => gradePart(c, { index, grade }))}
        disabled={s.locked || !segment}
      />
      {segment && !s.locked ? (
        <Button
          variant="ghost"
          label={v2.removeSegment}
          accessibilityLabel={`${v2.removeSegment} — ${title}`}
          onPress={() =>
            s.edit((c) => ({ ...c, segments: c.segments.filter((_, i) => i !== index) }))
          }
        />
      ) : null}
    </View>
  );
}

/** One Quran track (التسميع / الحفظ الجديد / المراجعة): its parts, each a range and a grade. */
export function SegmentCard(p: SegmentCardProps) {
  const v2 = t.reports.v2;
  const { content } = p.s.values;
  const parts = segmentsOf(content, p.kind);
  const first = parts[0];
  const canAdd = parts.length > 0 && content.segments.length < MAX_SEGMENTS && !p.s.locked;
  return (
    <Card title={v2.segment[p.kind]} aside={first ? rangeMeta(first.segment, v2) : null}>
      {first ? (
        parts.map(({ segment, index }, i) => (
          <Part key={index} {...p} segment={segment} index={index} later={i > 0} />
        ))
      ) : (
        <Part {...p} segment={null} index={-1} later={false} />
      )}
      {canAdd ? (
        <Button variant="secondary" label={v2.addSegment} onPress={() => p.onOpen(-1)} />
      ) : null}
    </Card>
  );
}
