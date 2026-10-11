import { useQuery } from '@tanstack/react-query';
import { t } from '@/lib/i18n';
import { salesLiveQuery } from './academy-api';

/**
 * The short block on the sales landing (the chats): «حلقات جارية الآن: N» with a link to /sales/live.
 * Nothing while none is running, while loading, on an error, or without the scope key.
 * A plain link (like EnterButton): it works without the router.
 */
export function SalesLiveStrip({ enabled }: { enabled: boolean }) {
  const live = useQuery({ ...salesLiveQuery, enabled });
  const n = live.data?.length ?? 0;
  if (!enabled || n === 0) return null;
  return (
    <aside aria-label={t.sales.live.title} className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-rule bg-sunk px-4 py-2">
      <span aria-hidden="true" className="size-2 rounded-full bg-ok motion-safe:animate-pulse" />
      <span className="font-semibold">{t.sales.live.strip.replace('{n}', String(n))}</span>
      <a href="/sales/live" className="text-sm font-semibold text-lapis underline underline-offset-4">
        {t.sales.live.open}
      </a>
    </aside>
  );
}
