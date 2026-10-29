import { formatPhone, type RegistrationMatch } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { usePermissions } from '@/auth';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { SearchField } from '@/core/ui/form/SearchField';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ltr } from '@/core/ui/primitives/Ltr';
import { ErrorLine } from '@/inbox';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';
import { RegistrationResults } from '../components/RegistrationResults';
import { linkFamilyErrorText, useLinkFamily } from '../lib/link-family';
import { type CheckSearch, checkErrorText, searchOf, useRegistrationCheck } from '../lib/registration-check';

/** The chat's number and its lead (ThreadView.lead_id), from the chat's «⋮» menu. */
type Params = { phone?: string; leadId?: string };

/** «ربط الرقم بعائلة {name} ({code})؟», the code kept left-to-right inside the Arabic sentence. */
const confirmText = (m: RegistrationMatch) =>
  t.inbox.linkFamily.confirm.replace('{name}', m.name).replace('{code}', ltr(m.code));

/** After the answer: «رُبط الرقم…» (added now) or «مرتبط بهذه العائلة من قبل», then back to the chat. */
function LinkDone({ linked, onBack }: { linked: boolean; onBack: () => void }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <AppText
        accessibilityRole="alert"
        style={{ fontFamily: type.ui[600], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink }}
      >
        {linked ? t.inbox.linkFamily.done : t.inbox.linkFamily.already}
      </AppText>
      <Button label={t.inbox.subscription.backToChat} onPress={onBack} />
    </View>
  );
}

/**
 * /…/inbox/link-family?phone&leadId (owner 2026-10-29), inside the chat's group in the admin and sales
 * trees: find the student by name or code (GET /sales/registration-check), pick one, confirm, and the
 * chat's number becomes the second number of that student's family (leads.link_family). Who follows up
 * the lead does not change; back in the chat it shows the family as on the main number.
 */
export function LinkFamilyScreen() {
  const { phone = '', leadId = '' } = useLocalSearchParams<Params>();
  const can = usePermissions();
  const base = useTreeBase();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<CheckSearch | null>(null);
  const [picked, setPicked] = useState<RegistrationMatch | null>(null);
  const check = useRegistrationCheck(search);
  const link = useLinkFamily(leadId);
  const back = () => (router.canGoBack() ? router.back() : router.replace(inTree(base, '/inbox')));
  const find = (q: string) => {
    setQuery(q);
    const next = searchOf('name', q);
    setSearch('search' in next ? next.search : null);
  };
  const pick = (m: RegistrationMatch | null) => {
    link.reset();
    setPicked(m);
  };

  const body = link.data ? (
    <LinkDone linked={link.data.linked} onBack={back} />
  ) : picked ? (
    <View style={{ gap: 8 }}>
      <InlineConfirm
        message={confirmText(picked)}
        confirmLabel={link.isPending ? t.inbox.linkFamily.linking : t.inbox.linkFamily.submit}
        busy={link.isPending}
        onConfirm={() => link.mutate(picked.code)}
        onCancel={() => !link.isPending && pick(null)}
      />
      {link.isError ? <ErrorLine message={linkFamilyErrorText(link.error)} /> : null}
    </View>
  ) : (
    <>
      <Note>{t.inbox.linkFamily.hint}</Note>
      <SearchField label={t.registrationCheck.query} initial={query} onSearch={find} compact />
      {!search ? null : check.isError ? (
        <ErrorState message={checkErrorText(check.error)} onRetry={() => void check.refetch()} />
      ) : check.data ? (
        <RegistrationResults view={check.data} by="name" onPick={pick} />
      ) : null}
    </>
  );

  return (
    <Screen>
      <ScreenHeader
        title={t.inbox.linkFamily.title}
        subtitle={phone ? ltr(formatPhone(phone)) : undefined}
        size="h2"
        connecting
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      {can('leads.link_family') && leadId ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : null}
    </Screen>
  );
}
