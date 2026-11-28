import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { t, pathKey, Button, ErrorLine } from '@ab/mobile-kit';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { leadWrites } from './lead-writes';

/** R-LEAD-04: the lead leaves the funnel, so success pops back and every lead list refetches. */
export function LeadReclassify({ id }: { id: string }) {
  const client = useQueryClient();
  const [asking, setAsking] = useState(false);
  const move = useMutation({
    mutationFn: () => leadWrites.reclassify(id),
    onSuccess: () => {
      router.back();
      void client.invalidateQueries({ queryKey: pathKey('/leads') });
    },
  });
  if (!asking) {
    return (
      <Button
        variant="secondary"
        label={t.leads.reclassifyAsApplicant}
        onPress={() => setAsking(true)}
      />
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <InlineConfirm
        message={t.leads.reclassifyConfirm}
        confirmLabel={move.isPending ? t.common.saving : t.leads.reclassifyAsApplicant}
        cancelLabel={t.leads.keepHere}
        busy={move.isPending}
        onConfirm={() => move.mutate()}
        onCancel={() => setAsking(false)}
      />
      {move.isError ? <ErrorLine message={t.common.error} /> : null}
    </View>
  );
}
