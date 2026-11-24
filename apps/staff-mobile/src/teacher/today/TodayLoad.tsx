import { t, ErrorState } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';

interface TodayLoadProps {
  query: { isError: boolean; data: unknown; refetch: () => unknown };
}

export function TodayLoad({ query }: TodayLoadProps) {
  if (query.data !== undefined) return null;
  if (!query.isError) return <Note>{t.common.loading}</Note>;
  return <ErrorState onRetry={() => void query.refetch()} message={t.teacherDash.loadError} />;
}
