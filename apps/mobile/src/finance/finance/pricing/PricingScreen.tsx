import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Section } from '@/core/ui/surface/Section';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { OfferActions } from './OfferActions';
import { PricingSteps } from './PricingSteps';
import { QuoteCard } from './QuoteCard';
import { DEFAULT_SELECTION, type Selection } from './selection';
import { useQuote } from './use-quote';

/**
 * «حاسبة الأسعار» (docs/08): the site calculator's steps, the API's quote in the guardian's
 * currency (USD for any other country), and the offer sent on WhatsApp or shared.
 */
export function PricingScreen() {
  const { color } = useTheme();
  const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION);
  const quote = useQuote(selection);
  const data = quote.data;
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 32 }}
      >
        <ScreenHeader title={t.pricing.title} subtitle={t.pricing.subtitle} trailing={back} />
        <PricingSteps
          selection={selection}
          onChange={(patch) => setSelection((s) => ({ ...s, ...patch }))}
        />
        <Section title={t.pricing.resultTitle}>
          {data ? (
            <>
              <QuoteCard quote={data} />
              <OfferActions quote={data} stale={quote.isPlaceholderData} />
            </>
          ) : quote.isError ? (
            <ErrorState onRetry={() => void quote.refetch()} />
          ) : (
            <ActivityIndicator color={color.lapis} />
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}
