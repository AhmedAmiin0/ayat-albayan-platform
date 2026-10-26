import { useQuery } from '@tanstack/react-query';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
import { callListQuery } from '../api/calls-api';
import { CallsLogRow } from './CallsLogRow';

/** «المكالمات» (docs/28 §5): every call this user may see, newest first (the API scopes a teacher's). */
export function CallsLog() {
  const calls = useQuery(callListQuery({ enabled: true, phone: null }));
  if (calls.isPending) return <ListSkeleton rows={6} />;
  if (calls.isError) return <p role="alert">{t.common.error}</p>;
  if (calls.data.length === 0) return <p className="px-2 py-6 text-center text-sm text-ink-3">{t.calls.log.empty}</p>;
  return (
    <ul aria-label={t.calls.log.title} className="grid gap-0.5">
      {calls.data.map((c) => (
        <CallsLogRow key={c.id} call={c} />
      ))}
    </ul>
  );
}
