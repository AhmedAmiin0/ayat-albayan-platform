import { router, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';
import { t } from '@/lib/i18n';
import { formatPhoneDisplay, whatsappLink } from '@/lib/phone';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { ltr } from '@/ui/Ltr';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { LeadFacts } from './LeadFacts';
import { LeadReclassify } from './LeadReclassify';
import { LeadStatusChanger } from './LeadStatusChanger';
import { useCachedLead } from './use-cached-lead';

/**
 * One conversation (R-MOB-02, partial): facts, status changer, WhatsApp, move to job applicants.
 * «فتح واتساب» is the only reply path for now.
 * TODO(R-MOB-02): message thread, in-app reply and templates arrive with Phase 4 messaging.
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
  const { name, phone_e164: phone } = lead.data;
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {back}
        <ScreenHeader title={name ?? ltr(formatPhoneDisplay(phone))} />
        <LeadFacts lead={lead.data} />
        <LeadStatusChanger lead={lead.data} />
        <Button
          label={t.mobile.openWhatsapp}
          onPress={() => void Linking.openURL(whatsappLink(phone))}
        />
        <LeadReclassify id={lead.data.id} />
      </ScrollView>
    </Screen>
  );
}
