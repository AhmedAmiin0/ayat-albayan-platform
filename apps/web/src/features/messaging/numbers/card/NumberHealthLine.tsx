import type { NumberView } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/features/sales/leads/format';
import { useClock } from '@/lib/clock';

const c = t.numbers.chips;
const h = t.numbers.health;

/** The last line check: a glyph and «سليم» / «فشل آخر فحص» (+ quality) and when; «لم يُفحص بعد» before any. */
export function NumberHealthLine({ view }: { view: NumberView }) {
  const clock = useClock();
  if (!view.health || !view.checked_at) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ink-3">
        <NuqtaGlyph shape="hollow" />
        <span>{c.notChecked}</span>
      </p>
    );
  }
  const { ok, quality_rating } = view.health;
  return (
    <p className={cn('flex flex-wrap items-center gap-x-1.5 text-xs', ok ? 'text-ok' : 'text-danger')}>
      <NuqtaGlyph shape={ok ? 'fill' : 'struck'} />
      <span className="font-semibold">{ok ? h.ok : h.failed}</span>
      {quality_rating && <span className="text-ink-2">· {h.quality.replace('{{q}}', quality_rating)}</span>}
      <span className="text-ink-3">· {c.checkedAt.replace('{{at}}', formatDateTime(view.checked_at, clock))}</span>
    </p>
  );
}
