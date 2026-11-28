import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { RowLabel } from '@ab/web-kit/components/ui/charts/RowLabel';
import { cn } from '@ab/web-kit/lib/utils';
import type { ShareLegendProps } from './ShareLegend.types';

export function ShareLegend({ segments }: ShareLegendProps) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {segments.map((s) => (
        <li key={s.key} data-segment={s.key} className="flex min-w-0 items-center gap-1.5">
          <NuqtaGlyph shape={s.glyph} className={cn('size-3', s.ink)} />
          <RowLabel label={s.label} onSelect={s.onSelect} />
          <span className="text-sm font-semibold text-ink tabular-nums">
            {s.valueLabel ?? String(s.value)}
          </span>
          <span className="text-xs text-ink-3 tabular-nums">{s.percent}</span>
        </li>
      ))}
    </ul>
  );
}
