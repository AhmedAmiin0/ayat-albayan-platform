import { router, useLocalSearchParams } from 'expo-router';
import { useCachedLead } from '@/inbox/leads/detail/use-cached-lead';
import { t, BackButton, ErrorState, Screen, ScreenHeader } from '@ab/mobile-kit';
import { BookingModeProvider } from '@/booking/shared/booking-mode';
import { isLeadSource, type BookingLead } from '@/booking/trial/lib/draft';
import { TrialWizard } from '@/booking/trial/components/TrialWizard';

type Params = {
  leadId?: string;
  /** From a chat: the lead's number and WhatsApp name, so no cached inbox list is needed. */
  phone?: string;
  name?: string;
  /** 'subscribe' offers paid packages too; 'register' books a sales trial, credited to her. */
  mode?: string;
  /** The lead's source from the chat, for the how-did-you-hear question. */
  source?: string;
};

/** The chat's own lead, from the route params (none without its id and number). */
function chatLead({ leadId, phone, name, source }: Params): BookingLead | undefined {
  if (!leadId || !phone) return undefined;
  return {
    id: leadId,
    phone_e164: phone,
    name: name ?? null,
    ...(isLeadSource(source) ? { source } : {}),
  };
}

/** R-MOB-02: the lead comes from the cached inbox or the chat; an unknown lead says so. */
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
            leading={<BackButton onPress={() => router.back()} />}
          />
          {cached.isError ? (
            <ErrorState message={t.common.notFound} onRetry={() => void cached.refetch()} />
          ) : null}
        </>
      )}
    </Screen>
  );
}
