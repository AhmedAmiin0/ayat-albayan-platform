import { useMutation, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { ErrorLine } from '../ErrorLine';
import type { Lead } from '../types';
import { useSalesPeople } from './use-sales-people';

const NONE = '';

/**
 * «مسؤول المبيعات» of one lead (admin, leads.assign): POST /leads/:id/assign with a salesperson from
 * GET /sales/people, or none to take it back. The detail shows the new owner at once; the lists refetch.
 */
export function LeadAssign({ lead }: { lead: Lead }) {
  const can = usePermissions();
  const client = useQueryClient();
  const allowed = can('leads.assign');
  const { people, isError, refetch } = useSalesPeople(allowed);
  const save = useMutation({
    mutationFn: (profileId: string | null) => apiSend<unknown>('POST', `/leads/${lead.id}/assign`, { profileId }),
    onSuccess: (_done, profileId) => {
      const name = people.find((p) => p.id === profileId)?.name ?? null;
      client.setQueryData<Lead>(pathKey(`/leads/${lead.id}`), { ...lead, assigned_to: profileId, assigned_to_name: name });
      void client.invalidateQueries({ queryKey: ['leads', 'list'] });
      void client.invalidateQueries({ queryKey: pathKey('/sales/people') });
    },
  });
  const { color } = useTheme();
  if (!allowed) return null;
  const current = lead.assigned_to ?? NONE;
  const known = !current || people.some((p) => p.id === current);
  const items: FilterPill<string>[] = [
    { value: NONE, label: t.sales.assign.none },
    ...(known ? [] : [{ value: current, label: lead.assigned_to_name ?? current }]),
    ...people.map((p) => ({ value: p.id, label: p.name })),
  ];
  return (
    <View style={{ gap: 4 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink2 }}>{t.mobileLeads.assignTitle}</AppText>
      {isError ? (
        <>
          <ErrorLine message={t.mobileLeads.peopleFailed} />
          <Button variant="ghost" label={t.mobile.retry} onPress={() => void refetch()} />
        </>
      ) : (
        <FilterPills
          wrap
          role="radiogroup"
          accessibilityLabel={t.sales.assign.rowLabel.replace('{name}', lead.name ?? lead.phone_e164)}
          items={items.map((i) => ({ ...i, disabled: save.isPending }))}
          value={current}
          onChange={(id) => id !== current && save.mutate(id || null)}
        />
      )}
      {save.isError ? <ErrorLine message={t.common.error} /> : null}
      {save.isSuccess ? <AppText accessibilityLiveRegion="polite" style={{ fontSize: type.size.xs, color: color.ink2 }}>{t.mobileLeads.assignRowSaved}</AppText> : null}
    </View>
  );
}
