import { counted, type TrialHistory } from '@ab/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { TrialHistoryTable } from './TrialHistoryTable';

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

export function TrialHistoryBody({ query }: { query: UseQueryResult<TrialHistory> }) {
  if (query.isError) return <FormAlert>{t.trialDate.loadError}</FormAlert>;
  if (!query.data) return <p className="text-sm text-ink-3">{t.common.loading}</p>;
  if (query.data.items.length === 0) return <p className="text-sm text-ink-2">{t.trialDate.empty}</p>;
  return <TrialHistoryTable history={query.data} />;
}
