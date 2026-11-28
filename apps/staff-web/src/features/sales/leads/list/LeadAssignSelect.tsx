import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, t } from '@ab/web-kit';
import { assignLead, salesPeopleQuery } from '@/features/sales/sales';
import type { LeadView } from '@ab/shared';
import { leadKeys, salesKeys } from '@/features/sales/keys';

export function LeadAssignSelect({ lead }: { lead: LeadView }) {
  const queryClient = useQueryClient();
  const people = useQuery(salesPeopleQuery);
  const options = Array.isArray(people.data) ? people.data : [];
  const save = useMutation({
    mutationFn: assignLead,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: leadKeys.all }),
      queryClient.invalidateQueries({ queryKey: salesKeys.people() }),
    ]),
  });
  const current = lead.assigned_to ?? '';
  const known = !current || options.some((p) => p.id === current);
  return (
    <Select
      aria-label={t.sales.assign.rowLabel.replace('{name}', lead.name ?? lead.phone_e164)}
      value={current}
      disabled={save.isPending}
      aria-invalid={save.isError || undefined}
      onChange={(e) => save.mutate({ leadId: lead.id, profileId: e.target.value || null })}
      className="h-9 min-w-0 text-xs"
    >
      <option value="">{t.sales.assign.none}</option>
      {!known && <option value={current}>{lead.assigned_to_name ?? current}</option>}
      {options.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}
