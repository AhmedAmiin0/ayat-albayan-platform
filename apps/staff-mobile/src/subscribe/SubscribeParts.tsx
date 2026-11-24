import type { QuoteResponse, StudentRef } from '@ab/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { View } from 'react-native';
import {
  t,
  type,
  useTheme,
  AppText,
  Button,
  ErrorState,
  FilterPills,
  NuqtaGlyph,
  Section,
} from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { DatePickerField } from '@/core/ui/form/date-picker';
import { QuotePreview } from './QuotePreview';
import { subscribeErrorText } from './subscribe-form';

export function StudentPills(p: {
  family: readonly StudentRef[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (p.family.length < 2) return null;
  return (
    <Section title={t.subscriptions.student}>
      <FilterPills
        items={p.family.map((f) => ({ value: f.id, label: f.name }))}
        value={p.value}
        onChange={p.onChange}
        accessibilityLabel={t.subscriptions.student}
        role="radiogroup"
      />
    </Section>
  );
}

export function PriceSection({ quote }: { quote: UseQueryResult<QuoteResponse> }) {
  return (
    <Section title={t.subscriptions.price}>
      {quote.isError ? (
        <ErrorState
          message={subscribeErrorText(quote.error, 'quote')}
          onRetry={() => void quote.refetch()}
        />
      ) : quote.data ? (
        <QuotePreview quote={quote.data} stale={quote.isPlaceholderData} />
      ) : (
        <Note>{t.common.loading}</Note>
      )}
    </Section>
  );
}

/** Picked on the date dialog, never typed (rule 6). */
interface StartDayFieldProps {
  days: readonly string[];
  value: string;
  onChange: (day: string) => void;
}

export function StartDayField(p: StartDayFieldProps) {
  const sorted = [...p.days].sort();
  const range = { min: sorted[0] ?? p.value, max: sorted.at(-1) ?? p.value };
  return (
    <DatePickerField
      label={t.subscriptions.startsOn}
      day={p.value}
      range={range}
      onChange={p.onChange}
      testID="start-day-open"
    />
  );
}

/** The package is saved: said like the booking's success (a fill nuqta, an Amiri title), then back to the chat. */
export function SavedPanel({ onBack }: { onBack: () => void }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NuqtaGlyph shape="fill" color={color.ok} size={14} />
        <AppText
          accessibilityRole="alert"
          style={{ fontFamily: type.display, fontSize: type.size.h2, lineHeight: type.lineHeight(type.size.h2, true), color: color.ink }}
        >
          {t.subscriptions.saved}
        </AppText>
      </View>
      <Button label={t.inbox.subscription.backToChat} onPress={onBack} />
    </View>
  );
}
