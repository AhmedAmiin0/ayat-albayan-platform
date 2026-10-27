import { TEACHER_REPORT_FILTER_KEYS, TEACHER_REPORT_SORT_KEYS } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DataTable } from '@/components/DataTable';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Pager } from '@/components/ui/layout/pager';
import { t } from '@/lib/i18n/i18n';
import {
  serverListProps,
  serverListState,
  type ServerListKeys,
  type ServerListPatch,
  type ServerListSearch,
} from '@/lib/list/server-list-search';
import { myReportsQuery } from '../api';
import { submittedReportColumns } from './submitted-report-columns';
import { useClock } from '@/lib/clock';

/** /teacher/reports URL keys (the API's params). */
export const MY_REPORTS_LIST_KEYS: ServerListKeys = { sort: TEACHER_REPORT_SORT_KEYS, filters: TEACHER_REPORT_FILTER_KEYS };

export interface SubmittedReportsProps {
  tz: string;
  /** The route's search: page, sort and column filters (R-NFR-08). */
  search: ServerListSearch;
  onSearch: (patch: ServerListPatch) => void;
}

/**
 * «تقارير مُرسلة» (R-REP-02, R-TCH-03): my sent reports, newest first, paged; sorted and filtered on
 * the server. Inside the edit window «تعديل التقرير» with its deadline, after it «عرض التقرير»; the
 * PDF once it is ready. The table stays while a filter matches nothing, so it can be cleared.
 */
export function SubmittedReports({ tz, search, onSearch }: SubmittedReportsProps) {
  const clock = useClock();
  const state = serverListState(search, MY_REPORTS_LIST_KEYS);
  const table = serverListProps(state, onSearch);
  const list = useQuery(myReportsQuery(state));
  const columns = useMemo(() => submittedReportColumns(tz, clock), [tz, clock]);
  return (
    <section aria-labelledby="submitted-reports" className="grid gap-2">
      <h2 id="submitted-reports" className="font-display text-h3 font-bold">
        {t.reports.submittedTitle}
      </h2>
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {list.data && (
        <>
          <DataTable
            stacked
            columns={columns}
            data={list.data.items}
            getRowId={(r) => r.id}
            emptyText={t.reports.noSubmitted}
            sort={table.sort}
            filters={table.filters}
            toolbar={{ total: list.data.total }}
          />
          <Pager page={state.page} total={list.data.total} pageSize={list.data.pageSize} onPage={table.onPage} />
        </>
      )}
    </section>
  );
}
