import { router, useLocalSearchParams } from 'expo-router';
import { useCachedLead } from '@/inbox/use-cached-lead';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { TrialWizard } from './TrialWizard';

/**
 * /inbox/book?leadId=… (R-MOB-02 «quick book trial»), opened from the lead screen. The lead comes
 * from the cached inbox like the lead screen's; a link without a known lead says so.
 */
export function BookTrialScreen() {
  const { leadId = '' } = useLocalSearchParams<{ leadId?: string }>();
  const lead = useCachedLead(leadId);
  return (
    <Screen>
      {lead.data ? (
        <TrialWizard key={lead.data.id} lead={lead.data} />
      ) : (
        <>
          <ScreenHeader
            title={t.booking.trialTitle}
            trailing={
              <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />
            }
          />
          {lead.isError ? (
            <ErrorState message={t.common.notFound} onRetry={() => void lead.refetch()} />
          ) : null}
        </>
      )}
    </Screen>
  );
}
