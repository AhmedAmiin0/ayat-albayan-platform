import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { ErrorLine } from '../ErrorLine';

/**
 * «عيّن العملاء الذين بلا مسؤول» (admin, leads.assign): POST /leads/assign-unassigned spreads every
 * ownerless lead over the salespeople. It asks first (it moves many rows), then says how many moved.
 */
export function AssignUnassigned({ owners }: { owners: number }) {
  const { color } = useTheme();
  const client = useQueryClient();
  const [asking, setAsking] = useState(false);
  const run = useMutation({
    mutationFn: () => apiSend<{ assigned: number }>('POST', '/leads/assign-unassigned'),
    // Settled, not success: the API assigns lead by lead, so even a 504 on a big backlog moved some.
    onSettled: () => {
      setAsking(false);
      void client.invalidateQueries({ queryKey: pathKey('/leads') });
      void client.invalidateQueries({ queryKey: pathKey('/sales/people') });
    },
  });
  if (asking) {
    return (
      <View style={{ gap: 8 }}>
        <InlineConfirm
          message={t.mobileLeads.assignAllConfirm}
          confirmLabel={run.isPending ? t.common.saving : t.sales.assign.assignAll}
          busy={run.isPending}
          onConfirm={() => run.mutate()}
          onCancel={() => !run.isPending && setAsking(false)}
        />
      </View>
    );
  }
  const done = run.data;
  return (
    <View style={{ gap: 4 }}>
      <Button
        variant="secondary"
        label={t.sales.assign.assignAll}
        onPress={() => {
          run.reset();
          setAsking(true);
        }}
      />
      {run.isError ? <ErrorLine message={t.common.error} /> : null}
      {done ? (
        <AppText
          accessibilityRole="alert"
          style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 }}
        >
          {done.assigned > 0
            ? t.sales.assign.assignedN.replace('{n}', String(done.assigned))
            : owners === 0
              ? t.mobileLeads.assignNoOwners
              : t.mobileLeads.assignAllNone}
        </AppText>
      ) : null}
    </View>
  );
}
