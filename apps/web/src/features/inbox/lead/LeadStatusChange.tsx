import { LEAD_STATUSES, type LeadStatus } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Select } from '@/components/ui/form/select';
import { errorCode } from '@/features/schedule/api';
import { t } from '@/lib/i18n/i18n';
import { changeLeadStatus, type InboxLead } from '../api/api';

export interface LeadStatusChangeProps {
  lead: InboxLead;
  onDone: (message: string, tone?: 'error') => void;
}

/**
 * «تغيير الحالة» (R-LEAD-01 funnel). The API owns the allowed moves (lead state machine) and
 * refuses the rest with 409 invalid_transition, shown in words.
 */
export function LeadStatusChange({ lead, onDone }: LeadStatusChangeProps) {
  const queryClient = useQueryClient();
  const [to, setTo] = useState<LeadStatus | ''>('');
  const selectId = useId();
  const change = useMutation({
    mutationFn: changeLeadStatus,
    onSuccess: async () => {
      setTo('');
      onDone(t.inbox.statusSaved);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onError: (e) => onDone(errorCode(e) === 'invalid_transition' ? t.leads.invalidTransition : t.common.error, 'error'),
  });

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (to) change.mutate({ id: lead.id, status: to });
      }}
    >
      {/* Label linked by id, not wrapping: a wrapped select puts its shown option into the name. */}
      <div className="grid min-w-0 flex-1 gap-1.5 text-sm font-semibold">
        <label htmlFor={selectId}>{t.leads.changeStatus}</label>
        <Select id={selectId} value={to} onChange={(e) => setTo(LEAD_STATUSES.find((s) => s === e.target.value) ?? '')}>
          <option value="">{t.enums.leadStatus[lead.status]}</option>
          {LEAD_STATUSES.filter((s) => s !== lead.status).map((s) => (
            <option key={s} value={s}>
              {t.enums.leadStatus[s]}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary" disabled={!to || change.isPending}>
        {change.isPending ? t.common.saving : t.inbox.applyStatus}
      </Button>
    </form>
  );
}
