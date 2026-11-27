import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { t, pathKey, type, useTheme, AppText, Button, ErrorLine } from '@ab/mobile-kit';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { assignAllUnassigned } from './use-sales-people';

/** Spreads every ownerless lead over the salespeople; asks first since it moves many rows. */
export function AssignUnassigned({ owners }: { owners: number }) {
  const { color } = useTheme();
  const client = useQueryClient();
  const [asking, setAsking] = useState(false);
  const run = useMutation({
    mutationFn: assignAllUnassigned,
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
