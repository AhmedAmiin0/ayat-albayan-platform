import { router, useLocalSearchParams } from 'expo-router';
import { useCachedLead } from '@/inbox/leads/detail/use-cached-lead';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { BookingModeProvider } from './booking-mode';
import { isLeadSource, type BookingLead } from './draft';
import { TrialWizard } from './TrialWizard';

type Params = {
  leadId?: string;
  /** From a chat: the lead's number and WhatsApp name, so no cached inbox list is needed. */
  phone?: string;
  name?: string;
  /**
   * 'subscribe' = the chat's «اشترك»: the wizard offers the paid packages too. 'register' = a
   * salesperson's «تسجيل طالب جديد»: the trial through /sales/booking (credited to her).
   */
  mode?: string;
  /** The lead's source from the chat, for «عرفت عننا منين؟». */
  source?: string;
};

/** The chat's own lead, from the route params (none without its id and number). */
function chatLead({ leadId, phone, name, source }: Params): BookingLead | undefined {
  if (!leadId || !phone) return undefined;
  return { id: leadId, phone_e164: phone, name: name ?? null, ...(isLeadSource(source) ? { source } : {}) };
}

/**
 * /inbox/book?leadId=… (R-MOB-02 «quick book trial»), opened from the lead screen; the lead comes
 * from the cached inbox like the lead screen's. From a chat's «اشترك» (…&phone&name&mode=subscribe)
 * the chat's own lead is enough, as for a salesperson's registration (…&mode=register), which then
 * returns to the same chat. A link without a known lead says so.
 */
export function BookTrialScreen() {
  const { leadId = '', phone, name, mode, source } = useLocalSearchParams<Params>();
  const cached = useCachedLead(leadId);
  const lead = cached.data ?? chatLead({ leadId, phone, name, source });
  const subscribe = mode === 'subscribe';
  return (
    <Screen>
      {lead ? (
        <BookingModeProvider value={mode === 'register' ? 'sales' : 'admin'}>
          <TrialWizard key={lead.id} lead={lead} subscribe={subscribe} />
        </BookingModeProvider>
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
