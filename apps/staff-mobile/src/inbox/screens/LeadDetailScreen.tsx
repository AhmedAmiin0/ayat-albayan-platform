import { clickToChatLink, formatPhone } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';
import { t, Button, BackButton, ErrorState, ltr, Screen, ScreenHeader } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';
import { LeadFacts } from '@/inbox/leads/detail/LeadFacts';
import { LeadReclassify } from '@/inbox/leads/detail/LeadReclassify';
import { LeadAssign } from '@/inbox/leads/detail/LeadAssign';
import { LeadStatusChanger } from '@/inbox/leads/detail/LeadStatusChanger';
import { LeadProfileSection } from '@/inbox/qualification/components/LeadProfileSection';
import { threadHref } from '@/inbox/thread/hooks/thread-cache';
import { useCachedLead } from '@/inbox/leads/detail/use-cached-lead';

/** R-MOB-02, R-LEAD-03/05. */
export function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lead = useCachedLead(id);
  const backIcon = <BackButton onPress={() => router.back()} />;
  // No header while it loads: the icon alone, its 44pt box at the screen's start edge.
  const back = <View style={{ alignSelf: 'flex-start', marginStart: -10 }}>{backIcon}</View>;
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
        <ScreenHeader title={name ?? ltr(formatPhone(phone))} leading={backIcon} />
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
              // Named, to stand apart from the trial status chip above, which only moves status.
              label={name ? t.booking.trialFor.replace('{name}', name) : t.booking.trialTitle}
              onPress={() => router.push({ pathname: '/inbox/book', params: { leadId: id } })}
            />
          ) : null}
          <Button
            variant="secondary"
            label={t.mobile.openWhatsapp}
            onPress={() => void Linking.openURL(clickToChatLink(phone))}
          />
        </ButtonRow>
        <LeadProfileSection lead={lead.data} />
        <LeadReclassify id={lead.data.id} />
      </ScrollView>
    </Screen>
  );
}
