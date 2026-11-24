import { RIYADH_TZ } from '@ab/time';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { backWithin } from '@/core/nav/back-within';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import {
  apiFetch,
  t,
  pathKey,
  Button,
  BackButton,
  ErrorState,
  ltr,
  Screen,
  ScreenHeader,
  ErrorLine,
} from '@ab/mobile-kit';
import { localDate } from '@/today';
import { CustomAmountPill } from '@/payments';
import { CustomPriceField } from '@/subscribe/custom-price/CustomPriceField';
import { useCustomPrice } from '@/subscribe/custom-price/use-custom-price';
import { NoCommissionNote } from '@/subscribe/NoCommissionNote';
import { PricingInputs } from '@/subscribe/PricingInputs';
import { formFrom, type FormPrefill } from '@/subscribe/form-prefill';
import { pricingOf, startDays, subscribeErrorText } from '@/subscribe/subscribe-form';
import { PriceSection, SavedPanel, StartDayField, StudentPills } from '@/subscribe/SubscribeParts';
import { useCreateSubscription, useSubscriptionQuote } from '@/subscribe/use-subscribe';
import { usePastUsedBefore } from '@/subscribe/UsedBeforeField';
import type { StudentProfile, StudentRef } from '@ab/shared';

type Params = FormPrefill & { studentId?: string; startsOn?: string; renew?: string };

const back = () => backWithin('/inbox');

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
  // docs/34 b: no family yet reads as the academy's zone (a data default, not a display).
  p ? { family: [p, ...p.siblings], tz: p.tz } : { family: [], tz: RIYADH_TZ };

const childLine = (s: StudentRef | undefined) =>
  s ? [s.name, s.code ? ltr(s.code) : null].filter(Boolean).join(' · ') : undefined;

/** A first day before the academy's today also asks lessons already used, sent only above 0. */
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
  // Off sends the default body, on adds the typed package price.
  const custom = useCustomPrice(quote.data);

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
          leading={<BackButton onPress={back} />}
        />
        {profile.isError ? <ErrorState onRetry={() => void profile.refetch()} /> : null}
        <StudentPills family={family} value={studentId} onChange={setStudentId} />
        <PricingInputs
          form={form}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          discountExtra={<CustomAmountPill on={custom.on} onChange={custom.setOn} />}
        />
        <PriceSection quote={quote} />
        <CustomPriceField price={custom} />
        <StartDayField
          days={startDays(now, tz, params.startsOn)}
          value={startsOn}
          onChange={setPicked}
        />
        <NoCommissionNote startsOn={startsOn} usedBefore={used.body.lessonsUsedBefore ?? 0} now={now} />
        {used.field}
        {save.isError ? <ErrorLine message={subscribeErrorText(save.error, 'save')} /> : null}
        {save.isSuccess ? (
          <SavedPanel onBack={back} />
        ) : (
          <Button
            label={save.isPending ? t.common.saving : t.inbox.subscription.make}
            busy={save.isPending}
            disabled={!priced || !custom.ok}
            onPress={() =>
              save.mutate({ studentId, pricing, startsOn, ...used.body, ...custom.body })
            }
          />
        )}
      </ScrollView>
    </Screen>
  );
}
