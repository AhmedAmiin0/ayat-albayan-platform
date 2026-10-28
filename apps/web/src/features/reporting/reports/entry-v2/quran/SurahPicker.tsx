import { fillSlots, rangeSummary } from '@ab/client-core';
import { surahName, type SurahRange } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { SearchInput } from '@/components/ui/form/search-input';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { AyahStepper } from './AyahStepper';
import { clampRange, surahStart, type PickTarget } from './picker-state';
import { SurahList } from './SurahList';

export interface SurahPickerProps {
  title: string;
  target: PickTarget;
  /** The student's recent surahs (memory.recent_surahs). */
  recent: readonly number[];
  onDone: (range: SurahRange) => void;
  onClose: () => void;
}

/** «اختر السورة والآيات»: search, recent surahs, the list, then the from / to steppers and «تمّ». */
export function SurahPicker({ title, target, recent, onDone, onClose }: SurahPickerProps) {
  const p = t.reports.v2.picker;
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<SurahRange | null>(target.start);
  const [after, setAfter] = useState(target.after);
  const pick = (surah: number) => {
    setAfter(null);
    setRange(surahStart(surah));
  };
  const summary = range ? rangeSummary(range, { ayahs: t.reports.v2.ayahs, summary: p.summary }) : null;
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>{p.cancel}</Button>
      <Button type="button" disabled={!range} onClick={() => range && onDone(range)}>{p.done}</Button>
    </>
  );
  return (
    <Dialog title={title} onClose={onClose} layout="center" actions={actions}>
      <div className="grid gap-3">
        <SearchInput aria-label={p.search} placeholder={p.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
        {recent.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-3">{p.recent}</span>
            {recent.map((n) => (
              <Button key={n} type="button" variant="secondary" size="sm" onClick={() => pick(n)}>{surahName(n, locale)}</Button>
            ))}
          </div>
        )}
        <SurahList query={query} selected={range?.surah ?? null} onPick={pick} />
        {range && (
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-4">
              <AyahStepper label={p.from} value={range.from} onChange={(from) => setRange(clampRange(range, { from }))} />
              <AyahStepper label={p.to} value={range.to} onChange={(to) => setRange(clampRange(range, { to }))} />
            </div>
            <p role="status" className="text-sm text-ink-2">
              {summary}
              {after !== null && ` ${fillSlots(p.afterLast, { ayah: after })}`}
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
