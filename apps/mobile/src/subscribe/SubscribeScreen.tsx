import { RIYADH_TZ } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import type { StudentProfile, StudentRef } from '@/students/shared/types';
import { localDate } from '@/today/lib/timeline';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { PricingInputs } from './PricingInputs';
import { formFrom, type FormPrefill } from './form-prefill';
import { pricingOf, startDays, subscribeErrorText } from './subscribe-form';
import { PriceSection, SavedPanel, StartDayPills, StudentPills } from './SubscribeParts';
import { useCreateSubscription, useSubscriptionQuote } from './use-subscribe';
import { usePastUsedBefore } from './UsedBeforeField';

/** studentId, the form's prefill (form-prefill) and, after a booking, the first lesson's day; renew from «جدّد الاشتراك». */
type Params = FormPrefill & { studentId?: string; startsOn?: string; renew?: string };

const back = () => (router.canGoBack() ? router.back() : router.replace('/inbox'));

/** GET /students/:id (the student screen's key): name, code, zone and the siblings to pick from. */
function useProfile(id: string) {
  const path = `/students/${id}`;
  return useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch<StudentProfile>(path),
    enabled: id !== '',
  });
}

/** The child with its siblings (the pills) and the family's zone (the day chips). */
const familyOf = (p: StudentProfile | undefined) =>
  p ? { family: [p, ...p.siblings], tz: p.tz } : { family: [], tz: RIYADH_TZ };

/** «يوسف · AB-0183». */
const childLine = (s: StudentRef | undefined) =>
  s ? [s.name, s.code ? ltr(s.code) : null].filter(Boolean).join(' · ') : undefined;

/**
 * /inbox/subscribe?studentId=… (R-SUB-01): «اشتراك جديد» / «جدّد الاشتراك» (its title) from a
 * chat, or right after booking a lead's package. The child (or a sibling), the calculator's inputs,
 * the API's price, the first day from chips (rule 6), then «اعمل الاشتراك» (POST /subscriptions),
 * «الاشتراك اتسجل» and back to the chat, now «مشترك». A first day before the academy's today (a booked
 * lesson already past) also asks «حلقات مستخدمة من الباقة» (owner 2026-10-28), sent only above 0.
 */
export function SubscribeScreen() {
  const params = useLocalSearchParams<Params>();
  const first = params.studentId ?? '';
  const profile = useProfile(first);
  const [studentId, setStudentId] = useState(first);
  const [form, setForm] = useState(() => formFrom(params));
  const [now] = useState(() => new Date());
  const { family, tz } = familyOf(profile.data);
  const today = localDate(now, tz);
  const [picked, setPicked] = useState(params.startsOn);
  const startsOn = picked ?? today;
  const pricing = pricingOf(form);
  const quote = useSubscriptionQuote(studentId, pricing);
  const save = useCreateSubscription();
  const priced = quote.isSuccess && !quote.isPlaceholderData;
  const used = usePastUsedBefore({ startsOn, quote: quote.data, now, today });

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={params.renew ? t.inbox.subscription.renew : t.subscriptions.new}
          subtitle={childLine(family.find((f) => f.id === studentId))}
          trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
        />
        {profile.isError ? <ErrorState onRetry={() => void profile.refetch()} /> : null}
        <StudentPills family={family} value={studentId} onChange={setStudentId} />
        <PricingInputs form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
        <PriceSection quote={quote} />
        <StartDayPills
          days={startDays(now, tz, params.startsOn)}
          today={today}
          value={startsOn}
          onChange={setPicked}
        />
        {used.field}
        {save.isError ? <ErrorLine message={subscribeErrorText(save.error, 'save')} /> : null}
        {save.isSuccess ? (
          <SavedPanel onBack={back} />
        ) : (
          <Button
            label={save.isPending ? t.common.saving : t.inbox.subscription.make}
            busy={save.isPending}
            disabled={!priced}
            onPress={() => save.mutate({ studentId, pricing, startsOn, ...used.body })}
          />
        )}
      </ScrollView>
    </Screen>
  );
}
