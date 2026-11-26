import { useMutation, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import {
  usePermissions,
  apiSend,
  t,
  pathKey,
  type,
  useTheme,
  AppText,
  Button,
  FilterPills,
  type FilterPill,
  ErrorLine,
} from '@ab/mobile-kit';
import { useSalesPeople } from './use-sales-people';
import type { LeadView } from '@ab/shared';
import { leadKeys } from '@/core/lib/keys';

const NONE = '';

/** Admin with leads.assign; none takes the lead back; the lists refetch. */
export function LeadAssign({ lead }: { lead: LeadView }) {
  const can = usePermissions();
  const client = useQueryClient();
  const allowed = can('leads.assign');
  const { people, isError, refetch } = useSalesPeople(allowed);
  const save = useMutation({
    mutationFn: (profileId: string | null) => apiSend<unknown>('POST', `/leads/${lead.id}/assign`, { profileId }),
    onSuccess: (_done, profileId) => {
      const name = people.find((p) => p.id === profileId)?.name ?? null;
      const next = { ...lead, assigned_to: profileId, assigned_to_name: name };
      client.setQueryData<LeadView>(leadKeys.one(lead.id), next);
      void client.invalidateQueries({ queryKey: leadKeys.lists });
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
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink2 }}>
        {t.mobileLeads.assignTitle}
      </AppText>
      {isError ? (
        <>
          <ErrorLine message={t.mobileLeads.peopleFailed} />
          <Button variant="secondary" label={t.mobile.retry} onPress={() => void refetch()} />
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
