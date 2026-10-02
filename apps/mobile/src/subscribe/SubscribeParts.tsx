import type { QuoteResponse } from '@ab/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import type { StudentRef } from '@/students/types';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills } from '@/ui/FilterPills';
import { NuqtaGlyph } from '@/ui/NuqtaGlyph';
import { QuotePreview } from './QuotePreview';
import { startDayLabel, subscribeErrorText } from './subscribe-form';

/** «الطالب»: the child and the siblings to subscribe instead; nothing for an only child. */
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

/** «السعر»: the API's quote, its error with a retry, or loading. */
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

/** «بداية الباقة»: day chips, never a typed date (rule 6). */
export function StartDayPills(p: {
  days: readonly string[];
  today: string;
  value: string;
  onChange: (day: string) => void;
}) {
  return (
    <Section title={t.subscriptions.startsOn}>
      <FilterPills
        items={p.days.map((d) => ({ value: d, label: startDayLabel(d, p.today) }))}
        value={p.value}
        onChange={p.onChange}
        accessibilityLabel={t.subscriptions.startsOn}
        role="radiogroup"
      />
    </Section>
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
