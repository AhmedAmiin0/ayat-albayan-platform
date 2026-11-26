import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { t } from '@ab/web-kit';
import { salesLiveQuery } from '@/features/sales/sales/academy-api';

/** Hidden while loading, on error or without the scope key; compact uses a router Link. */
export function SalesLiveStrip({
  enabled,
  compact = false,
}: {
  enabled: boolean;
  compact?: boolean;
}) {
  const live = useQuery({ ...salesLiveQuery, enabled });
  const n = live.data?.length ?? 0;
  if (!enabled || n === 0) return null;
  const text = t.sales.live.strip.replace('{n}', String(n));
  if (compact) {
    return (
      <Link
        to="/sales/live"
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-rule bg-sunk px-2.5 text-2xs font-semibold text-ink-2 tabular-nums hover:text-ink pointer-coarse:min-h-11"
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-ok motion-safe:animate-pulse" />
        {text}
      </Link>
    );
  }
  return (
    <aside aria-label={t.sales.live.title} className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-rule bg-sunk px-4 py-2">
      <span aria-hidden="true" className="size-2 rounded-full bg-ok motion-safe:animate-pulse" />
      <span className="font-semibold">{text}</span>
      <a href="/sales/live" className="text-sm font-semibold text-lapis underline underline-offset-4">
        {t.sales.live.open}
      </a>
    </aside>
  );
}
