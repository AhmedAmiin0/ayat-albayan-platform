import { RIYADH_TZ } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import type { StudentProfile, StudentRef } from '@/students/types';
import { localDate } from '@/today/timeline';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { ltr } from '@/ui/Ltr';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { PricingInputs } from './PricingInputs';
import { formFrom, pricingOf, startDays, subscribeErrorText } from './subscribe-form';
import { PriceSection, StartDayPills, StudentPills } from './SubscribeParts';
import { useCreateSubscription, useSubscriptionQuote } from './use-subscribe';

/** studentId; after a booking also its package size, lesson minutes and first lesson's day. */
type Params = { studentId?: string; pkg?: string; minutes?: string; startsOn?: string };

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
 * /inbox/subscribe?studentId=… (R-SUB-01): «اشتراك جديد» / «جدّد» from a chat, or right after
 * booking a lead's package. The child (or a sibling), the calculator's inputs, the API's price,
 * the first day from chips (rule 6), then POST /subscriptions and back to the chat, now «مشترك».
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

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={t.subscriptions.new}
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
        {save.isError ? <ErrorLine message={subscribeErrorText(save.error, 'save')} /> : null}
        <Button
          label={save.isPending ? t.common.saving : t.common.save}
          busy={save.isPending || !priced}
          onPress={() => save.mutate({ studentId, pricing, startsOn }, { onSuccess: back })}
        />
      </ScrollView>
    </Screen>
  );
}
