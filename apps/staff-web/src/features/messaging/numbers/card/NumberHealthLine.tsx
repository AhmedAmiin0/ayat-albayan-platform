import type { NumberView } from '@ab/shared';
import { NuqtaGlyph, t, cn, useClock } from '@ab/web-kit';
import { formatDateTime } from '@/features/sales/leads/format';

const c = t.numbers.chips;
const h = t.numbers.health;

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
