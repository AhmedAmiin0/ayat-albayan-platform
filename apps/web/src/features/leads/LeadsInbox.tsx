import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche } from '@/components/ui/cartouche';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { Toast, type ToastProps } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { AssignUnassignedButton } from './AssignUnassignedButton';
import { LeadList } from './LeadList';
import { leadsQuery, reclassifyLead } from './leads.api';
import { LeadStatusTabs } from './LeadStatusTabs';
import { LeadsToolbar } from './LeadsToolbar';
import { parseLeadSearch, type LeadSearch } from './types';

export interface LeadsInboxProps {
  search: LeadSearch;
  onSearch: (next: LeadSearch) => void;
}

type Notice = Pick<ToastProps, 'message' | 'tone'>;

/** «10 محادثة», or «3 جديد» under a status filter, so the number names what it counts. */
function countLabel(total: number, status: LeadSearch['status']): string {
  if (!status) return t.leads.count.replace('{n}', String(total));
  return t.leads.countStatus.replace('{n}', String(total)).replace('{status}', t.enums.leadStatus[status]);
}

/**
 * Admin lead inbox (R-LEAD-01/02, docs/07 §9): cartouche + total, search and source filter, the
 * status fihris beside the rows, one-click reclassify with an inline confirm (R-LEAD-04).
 */
export function LeadsInbox({ search, onSearch }: LeadsInboxProps) {
  const queryClient = useQueryClient();
  const leads = useQuery(leadsQuery(search));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const reclassify = useMutation({
    mutationFn: reclassifyLead,
    onSuccess: async () => {
      setConfirmId(null);
      setNotice({ message: t.leads.reclassified });
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['job-applicants'] });
    },
    onError: () => setNotice({ message: t.common.error, tone: 'error' }),
  });
  // Any filter change goes back to page 1; parseLeadSearch drops blank / unknown values.
  const filter = (patch: Record<string, unknown>) => onSearch(parseLeadSearch({ ...search, ...patch, page: 1 }));

  return (
    <>
      <PageHead>
        <Cartouche>{t.leads.title}</Cartouche>
        <AssignUnassignedButton />
        {/* TODO(R-LEAD-02): «11 مستنيين رد» once the API returns an unreplied count. */}
        {leads.data && (
          <span className="text-sm text-ink-3 tabular-nums">{countLabel(leads.data.total, search.status)}</span>
        )}
      </PageHead>
      <LeadsToolbar search={search} onFilter={filter} />
      <div className="grid gap-[22px] shell:grid-cols-[196px_minmax(0,1fr)]">
        <LeadStatusTabs value={search.status} onChange={(status) => filter({ status })} />
        <div
          className={cn('min-w-0 transition-opacity duration-[120ms]', leads.isPlaceholderData && 'opacity-60')}
          aria-busy={leads.isPlaceholderData || undefined}
        >
          {leads.isError && <p role="alert">{t.common.error}</p>}
          {leads.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
          {leads.data && (
            <>
              <LeadList
                leads={leads.data.items}
                confirmId={confirmId}
                busy={reclassify.isPending}
                onConfirm={setConfirmId}
                onMove={(id) => reclassify.mutate(id)}
              />
              <Pager
                page={search.page}
                total={leads.data.total}
                pageSize={leads.data.pageSize}
                onPage={(page) => onSearch({ ...search, page })}
              />
            </>
          )}
        </div>
      </div>
      {notice && <Toast {...notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}
