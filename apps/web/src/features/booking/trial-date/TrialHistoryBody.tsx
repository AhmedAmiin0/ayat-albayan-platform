import { counted, type TrialHistory } from '@ab/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n';
import { TrialHistoryTable } from './TrialHistoryTable';

/** «مواعيد الحلقة التجريبية · 3 مواعيد»: the history's title and its count (counted). */
export function TrialHistoryTitle({ history, id }: { history: TrialHistory | undefined; id?: string }) {
  return (
    <h2 id={id} className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
      <span>{t.trialDate.historyTitle}</span>
      {history && (
        <span data-testid="trial-date-count" className="text-xs font-normal text-ink-3 tabular-nums">
          {counted(t.trialDate.count, history.count)}
        </span>
      )}
    </h2>
  );
}

/** The history's states: loading, «تعذّر تحميل…», «لم يُحدَّد أي موعد…», else the table. */
export function TrialHistoryBody({ query }: { query: UseQueryResult<TrialHistory> }) {
  if (query.isError) return <FormAlert>{t.trialDate.loadError}</FormAlert>;
  if (!query.data) return <p className="text-sm text-ink-3">{t.common.loading}</p>;
  if (query.data.items.length === 0) return <p className="text-sm text-ink-2">{t.trialDate.empty}</p>;
  return <TrialHistoryTable history={query.data} />;
}
