import { t } from '@/core/lib/i18n/i18n';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from '@/core/ui/feedback/Note';

interface TodayLoadProps {
  query: { isError: boolean; data: unknown; refetch: () => unknown };
}

/** Before the first answer: «جارٍ التحميل»; failed with nothing saved: the error with a retry. */
export function TodayLoad({ query }: TodayLoadProps) {
  if (query.data !== undefined) return null;
  if (!query.isError) return <Note>{t.common.loading}</Note>;
  return <ErrorState onRetry={() => void query.refetch()} message={t.teacherDash.loadError} />;
}
