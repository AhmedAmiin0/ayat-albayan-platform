import { router, useLocalSearchParams } from 'expo-router';
import { useCachedLead } from '@/inbox/use-cached-lead';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import type { BookingLead } from './draft';
import { TrialWizard } from './TrialWizard';

type Params = {
  leadId?: string;
  /** From a chat: the lead's number and WhatsApp name, so no cached inbox list is needed. */
  phone?: string;
  name?: string;
  /** 'subscribe' = the chat's «اشترك»: the wizard offers the paid packages too. */
  mode?: string;
};

/**
 * /inbox/book?leadId=… (R-MOB-02 «quick book trial»), opened from the lead screen; the lead comes
 * from the cached inbox like the lead screen's. From a chat's «اشترك» (…&phone&name&mode=subscribe)
 * the chat's own lead is enough. A link without a known lead says so.
 */
export function BookTrialScreen() {
  const { leadId = '', phone, name, mode } = useLocalSearchParams<Params>();
  const cached = useCachedLead(leadId);
  const fromChat: BookingLead | undefined =
    leadId && phone ? { id: leadId, phone_e164: phone, name: name ?? null } : undefined;
  const lead = cached.data ?? fromChat;
  const subscribe = mode === 'subscribe';
  return (
    <Screen>
      {lead ? (
        <TrialWizard key={lead.id} lead={lead} subscribe={subscribe} />
      ) : (
        <>
          <ScreenHeader
            title={subscribe ? t.subscriptions.new : t.booking.trialTitle}
            trailing={
              <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />
            }
          />
          {cached.isError ? (
            <ErrorState message={t.common.notFound} onRetry={() => void cached.refetch()} />
          ) : null}
        </>
      )}
    </Screen>
  );
}
