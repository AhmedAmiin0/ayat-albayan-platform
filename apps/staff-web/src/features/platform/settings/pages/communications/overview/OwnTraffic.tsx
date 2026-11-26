import { useQuery } from '@tanstack/react-query';
import { ownTrafficQuery } from '@/features/messaging/numbers';
import { t } from '@ab/web-kit';

const h = t.communicationsHub;

/** Inter-academy messages are hidden from chats, so this shows the old system still sends. */
export function OwnTraffic() {
  const traffic = useQuery(ownTrafficQuery);
  return (
    <section aria-labelledby="overview-own-traffic" className="grid gap-1">
      <h2 id="overview-own-traffic" className="text-h4 font-bold">
        {h.ownTrafficTitle}
      </h2>
      <p aria-live="polite" className="text-sm font-semibold">
        {traffic.data && h.ownTrafficCount.replace('{n}', String(traffic.data.inbound_7d))}
        {traffic.isError && <span className="font-normal text-ink-2">{h.ownTrafficError}</span>}
      </p>
      <p className="text-xs text-ink-2">{h.ownTrafficHint}</p>
    </section>
  );
}
