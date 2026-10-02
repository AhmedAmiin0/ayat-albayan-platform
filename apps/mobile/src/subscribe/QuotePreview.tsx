import { counted, type QuoteResponse } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { money } from '@/payments/format';
import { FxNote } from '@/pricing/FxNote';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { ltr } from '@/ui/Ltr';

const p = t.pricing;
const minutes: Readonly<Record<string, string | undefined>> = p.durations;

/** «الباقة المتقدمة · 12 حلقة · 45 دقيقة», the calculator's words. */
export function planText(q: QuoteResponse): string {
  const { name, sessions } =
    q.package === 'custom'
      ? { name: p.packages.custom.name, sessions: counted(p.customSessions, q.lessons) }
      : p.packages[q.package];
  return [name, sessions, minutes[String(q.duration)] ?? String(q.duration)].join(' · ');
}

/**
 * The price the package will be stored with (R-SUB-01): POST /subscriptions/quote, after the
 * discount, in the guardian's currency. Shown, never typed (subscriptions.priceHint).
 */
export function QuotePreview({ quote: q, stale }: { quote: QuoteResponse; stale: boolean }) {
  const { color } = useTheme();
  const small = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  return (
    <View
      accessibilityState={{ busy: stale }}
      style={{
        gap: 6,
        padding: 14,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
        opacity: stale ? 0.6 : 1,
      }}
    >
      <AppText
        accessibilityLiveRegion="polite"
        style={{
          fontFamily: type.display,
          fontSize: type.size.h1,
          lineHeight: type.lineHeight(type.size.h1, true),
          color: color.ink,
        }}
      >
        {money(q.afterDiscount, q.currency)}
      </AppText>
      <AppText style={small}>{planText(q)}</AppText>
      {q.discount > 0 ? (
        <AppText style={small}>
          {`${p.discountLabel} ${ltr(`${q.discount}%`)} · ${p.insteadOf} ${money(q.total, q.currency)}`}
        </AppText>
      ) : null}
      {q.fx ? <FxNote fx={q.fx} /> : null}
      <Note>{t.subscriptions.priceHint}</Note>
    </View>
  );
}
