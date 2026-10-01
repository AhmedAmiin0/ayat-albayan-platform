import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { t } from '@/lib/i18n';
import { leadColumns } from './leadColumns';
import { leadsQuery, reclassifyLead } from './leads.api';
import { LeadStatusTabs } from './LeadStatusTabs';
import { Pager } from './Pager';
import type { LeadRow, LeadSearch } from './types';

export interface LeadsInboxProps {
  search: LeadSearch;
  onSearch: (next: LeadSearch) => void;
}

/** Admin lead inbox list (R-LEAD-01/02, no messaging yet) with one-click reclassify (R-LEAD-04). */
export function LeadsInbox({ search, onSearch }: LeadsInboxProps) {
  const queryClient = useQueryClient();
  const leads = useQuery(leadsQuery(search));
  const [notice, setNotice] = useState<string | null>(null);
  const reclassify = useMutation({
    mutationFn: (row: LeadRow) => reclassifyLead(row.id),
    onSuccess: async () => {
      setNotice(t.leads.reclassified);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['job-applicants'] });
    },
    onError: () => setNotice(t.common.error),
  });

  const columns = leadColumns({
    onReclassify: (row) => {
      if (window.confirm(t.leads.reclassifyConfirm)) reclassify.mutate(row);
    },
    busyId: reclassify.isPending ? (reclassify.variables?.id ?? null) : null,
  });

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{t.leads.title}</h2>
      <LeadStatusTabs
        value={search.status}
        onChange={(status) => onSearch(status ? { status, page: 1 } : { page: 1 })}
      />
      {notice && <p role="status">{notice}</p>}
      {leads.isError && <p role="alert">{t.common.error}</p>}
      {leads.isPending && <p>{t.common.loading}</p>}
      {leads.data && (
        <>
          <DataTable
            columns={columns}
            data={leads.data.items}
            getRowId={(r) => r.id}
            emptyText={t.leads.empty}
          />
          <Pager
            page={search.page}
            total={leads.data.total}
            pageSize={leads.data.pageSize}
            onPage={(page) => onSearch({ ...search, page })}
          />
        </>
      )}
    </section>
  );
}
