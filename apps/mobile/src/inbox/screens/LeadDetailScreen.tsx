import { formatPhone } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { whatsappLink } from '@/core/lib/phone';
import { Button } from '@/core/ui/primitives/Button';
import { ButtonRow } from '@/core/ui/actions';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { LeadFacts } from '../leads/detail/LeadFacts';
import { LeadReclassify } from '../leads/detail/LeadReclassify';
import { LeadAssign } from '../leads/detail/LeadAssign';
import { LeadStatusChanger } from '../leads/detail/LeadStatusChanger';
import { LeadProfileSection } from '../qualification/LeadProfileSection';
import { threadHref } from '../thread/hooks/thread-cache';
import { useCachedLead } from '../leads/detail/use-cached-lead';

/**
 * One lead (R-MOB-02): facts, status changer, the WhatsApp thread (reply and templates in the app),
 * «حجز حلقة تجريبية» (quick book), WhatsApp itself as the fallback, the follow-up and «بيانات الطالب»
 * (R-LEAD-03/05), move to job applicants.
 */
export function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lead = useCachedLead(id);
  const back = (
    <View style={{ alignSelf: 'flex-start', marginStart: -20 }}>
      <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />
    </View>
  );
  if (!lead.data) {
    return (
      <Screen>
        {back}
        {lead.isError ? (
          <ErrorState message={t.common.notFound} onRetry={() => void lead.refetch()} />
        ) : null}
      </Screen>
    );
  }
  const { name, phone_e164: phone, status } = lead.data;
  // As the web lead panel: a converted lead (its number may be a family's now) or a lost one books no trial here.
  const open = status !== 'converted' && status !== 'lost';
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {back}
        <ScreenHeader title={name ?? ltr(formatPhone(phone))} />
        <LeadFacts lead={lead.data} />
        <LeadStatusChanger lead={lead.data} />
        <LeadAssign lead={lead.data} />
        <Button
          label={t.inbox.openThread.replace('{name}', name ?? ltr(formatPhone(phone)))}
          onPress={() => router.push(threadHref(phone))}
        />
        <ButtonRow>
          {open ? (
            <Button
              variant="secondary"
              // Named: «… لهدى», apart from the «حجز حلقة تجريبية» status chip above (a move only).
              label={name ? t.booking.trialFor.replace('{name}', name) : t.booking.trialTitle}
              onPress={() => router.push({ pathname: '/inbox/book', params: { leadId: id } })}
            />
          ) : null}
          <Button
            variant="secondary"
            label={t.mobile.openWhatsapp}
            onPress={() => void Linking.openURL(whatsappLink(phone))}
          />
        </ButtonRow>
        <LeadProfileSection lead={lead.data} />
        <LeadReclassify id={lead.data.id} />
      </ScrollView>
    </Screen>
  );
}
