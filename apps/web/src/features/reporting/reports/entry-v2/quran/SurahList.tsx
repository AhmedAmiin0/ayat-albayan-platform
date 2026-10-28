import { fillSlots } from '@ab/client-core';
import { ayahCount, juzOf, searchSurahs, surahName } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { cn } from '@/lib/utils';

export interface SurahListProps {
  query: string;
  selected: number | null;
  onPick: (surah: number) => void;
}

/** The surahs matching the search (number, Arabic or English name), with their ayahs and juz. */
export function SurahList({ query, selected, onPick }: SurahListProps) {
  const p = t.reports.v2.picker;
  const found = searchSurahs(query);
  if (found.length === 0) return <p className="py-3 text-sm text-ink-3">{p.noMatch}</p>;
  return (
    <ul className="grid max-h-64 overflow-y-auto rounded-md border border-rule">
      {found.map((n) => (
        <li key={n} className="border-b border-rule last:border-b-0">
          <button
            type="button"
            aria-pressed={selected === n}
            onClick={() => onPick(n)}
            className={cn('flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-sunk', selected === n && 'bg-lapis-wash')}
          >
            <span className="w-7 text-xs tabular-nums text-ink-3">{n}</span>
            <span className="flex-1 text-sm font-semibold">{fillSlots(p.surahItem, { name: surahName(n, locale) })}</span>
            <span className="text-xs text-ink-3">{fillSlots(p.surahMeta, { n: ayahCount(n), juz: juzOf({ surah: n, ayah: 1 }) })}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
