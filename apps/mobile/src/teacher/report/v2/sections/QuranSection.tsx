import { SEGMENT_KINDS, TAJWEED_TOPICS, segmentsOf, type SegmentKind } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { placeRange, toggleTajweed } from '../hooks/content-edit';
import type { V2EntryState } from '../hooks/use-v2-entry';
import { startDraft } from '../picker/picker-state';
import { SurahPickerSheet } from '../picker/SurahPickerSheet';
import { Card } from '../ui/Card';
import { Pills } from '../ui/Pills';
import { SegmentCard } from './SegmentCard';

interface Target {
  kind: SegmentKind;
  index: number;
}

/**
 * The Quran lesson (attended): the three tracks, then «الدرس النظري / التجويد». A new part opens
 * the picker right after the track's last part today, else after the last saved one (entry.memory).
 */
export function QuranSection({ s }: { s: V2EntryState }) {
  const v2 = t.reports.v2;
  const [target, setTarget] = useState<Target | null>(null);
  const { content } = s.values;
  const memory = s.entry.memory;
  const startOf = ({ kind, index }: Target) =>
    startDraft({
      current: content.segments[index] ?? null,
      last: segmentsOf(content, kind).at(-1)?.segment ?? memory?.last[kind] ?? null,
    });
  const tajweed = TAJWEED_TOPICS.map((k) => ({ value: k, label: v2.tajweed[k] }));
  return (
    <View style={{ gap: 14 }}>
      {SEGMENT_KINDS.map((kind) => (
        <SegmentCard key={kind} s={s} kind={kind} onOpen={(index) => setTarget({ kind, index })} />
      ))}
      <Card title={v2.tajweedTitle} optional>
        <Pills
          label={v2.tajweedTitle}
          items={tajweed}
          isOn={(k) => k === content.tajweed}
          onPress={(k) => s.edit((c) => toggleTajweed(c, k))}
          disabled={s.locked}
        />
      </Card>
      {target ? (
        <SurahPickerSheet
          title={v2.segment[target.kind]}
          start={startOf(target)}
          recent={memory?.recent_surahs ?? []}
          onCancel={() => setTarget(null)}
          onDone={(range) => {
            s.edit((c) => placeRange(c, { ...target, range }));
            setTarget(null);
          }}
        />
      ) : null}
    </View>
  );
}
