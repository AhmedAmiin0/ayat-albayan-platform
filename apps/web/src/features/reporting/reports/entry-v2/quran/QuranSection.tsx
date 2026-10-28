import { SEGMENT_KINDS, TAJWEED_TOPICS, withSegment, type MemoryView, type SurahRange } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import type { ReportEntryV2State } from '../use-report-entry-v2';
import { ToggleChips } from '../ToggleChips';
import { CARD, CARD_TITLE, OPTIONAL } from '../v2-classes';
import { pickTarget, type PickTarget } from './picker-state';
import { SegmentCard } from './SegmentCard';
import { SurahPicker } from './SurahPicker';

export interface QuranSectionProps {
  s: ReportEntryV2State;
  memory: MemoryView | null | undefined;
}

/** Quran: the three tracks with their surah parts, the picker, and the optional tajweed topic. */
export function QuranSection({ s, memory }: QuranSectionProps) {
  const v2 = t.reports.v2;
  const [target, setTarget] = useState<PickTarget | null>(null);
  const { content } = s.values;
  const done = (range: SurahRange) => {
    if (!target) return;
    const { kind, index } = target;
    s.setContent((c) => withSegment(c, { index, segment: { kind, ...range, grade: c.segments[index]?.grade ?? null } }));
    setTarget(null);
  };
  const tajweed = TAJWEED_TOPICS.map((k) => ({ value: k, label: v2.tajweed[k] }));
  return (
    <>
      {SEGMENT_KINDS.map((kind) => (
        <SegmentCard key={kind} s={s} kind={kind} onPick={(index) => setTarget(pickTarget(content, { kind, index, memory }))} />
      ))}
      <section aria-label={v2.tajweedTitle} className={CARD}>
        <h3 className={CARD_TITLE}>
          {v2.tajweedTitle} <span className={OPTIONAL}>{v2.optional}</span>
        </h3>
        <ToggleChips
          label={v2.tajweedTitle}
          options={tajweed}
          selected={content.tajweed ? [content.tajweed] : []}
          onToggle={(k) => s.setContent((c) => ({ ...c, tajweed: c.tajweed === k ? null : k }))}
        />
      </section>
      {target && (
        <SurahPicker
          title={v2.segment[target.kind]}
          target={target}
          recent={memory?.recent_surahs ?? []}
          onDone={done}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
