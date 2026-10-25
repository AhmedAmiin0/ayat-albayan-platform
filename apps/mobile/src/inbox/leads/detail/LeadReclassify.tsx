import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { ErrorLine } from '../../ErrorLine';

/**
 * R-LEAD-04 on mobile: «نقل لطلبات التوظيف» → inline confirm → POST /leads/:id/reclassify.
 * The lead leaves the funnel, so on success the screen pops back and every lead list refetches.
 */
export function LeadReclassify({ id }: { id: string }) {
  const client = useQueryClient();
  const [asking, setAsking] = useState(false);
  const move = useMutation({
    mutationFn: () => apiSend<unknown>('POST', `/leads/${id}/reclassify`),
    onSuccess: () => {
      router.back();
      void client.invalidateQueries({ queryKey: pathKey('/leads') });
    },
  });
  if (!asking) {
    return (
      <Button
        variant="ghost"
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
