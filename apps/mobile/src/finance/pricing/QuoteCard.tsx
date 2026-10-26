import { counted, formatAmount } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ltr } from '@/core/ui/primitives/Ltr';
import { FxNote } from './FxNote';
import type { QuoteResponse } from './use-quote';

const p = t.pricing;
const DURATIONS: Readonly<Record<string, string>> = p.durations;

/** «12 حلقة - 45 دقيقة للحلقة», the same words as the WhatsApp offer. */
function planLine(q: QuoteResponse): { name: string; detail: string } {
  const { name, sessions } =
    q.package === 'custom'
      ? { name: p.packages.custom.name, sessions: counted(p.customSessions, q.lessons) }
      : p.packages[q.package];
  const minutes = DURATIONS[String(q.duration)] ?? String(q.duration);
  return { name, detail: `${sessions} - ${minutes} ${p.perCircle}` };
}

function FactRow({ label, value }: { label: string; value: string }) {
  const { color } = useTheme();
  const text = { fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body) };
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <AppText style={{ ...text, fontFamily: type.ui[400], color: color.ink2 }}>{label}</AppText>
      <AppText
        style={{
          ...text,
          fontFamily: type.ui[600],
          color: color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

/** «الباقة المناسبة للعميل»: every number is the API's quote, shown in Western digits. */
export function QuoteCard({ quote: q }: { quote: QuoteResponse }) {
  const { color } = useTheme();
  const money = (n: number) => `${ltr(formatAmount(n))} ${p.currencies[q.currency]}`;
  const plan = planLine(q);
  return (
    <View
      style={{
        gap: 12,
        padding: 16,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <View style={{ gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.base, color: color.ink }}>
          {plan.name}
        </AppText>
        <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 }}>
          {plan.detail}
        </AppText>
      </View>
      <View>
        <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}>
          {q.students > 1 ? `${p.packagePrice} ${p.perStudent}` : p.packagePrice}
        </AppText>
        {/* Android reads the new price out when it changes (docs/07 a11y). */}
        <AppText
          accessibilityLiveRegion="polite"
          style={{
            fontFamily: type.display,
            fontSize: type.size.h1,
            lineHeight: type.lineHeight(type.size.h1, true),
            color: color.ink,
          }}
        >
          {money(q.price)}
        </AppText>
        {q.savingsPct !== null && q.insteadOf !== null ? (
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ok }}>
            {`${p.saveLabel} ${ltr(`${q.savingsPct}%`)} · ${p.insteadOf} ${money(q.insteadOf)}`}
          </AppText>
        ) : null}
      </View>
      <FactRow label={p.perCircleLabel} value={money(q.perLesson)} />
      <FactRow label={p.total} value={money(q.total)} />
      {q.discount > 0 ? (
        <>
          <FactRow label={p.discountLabel} value={ltr(`${q.discount}%`)} />
          <FactRow label={p.afterDiscount} value={money(q.afterDiscount)} />
        </>
      ) : null}
      <Note>{p.trialNote}</Note>
      {q.fx ? <FxNote fx={q.fx} /> : null}
    </View>
  );
}
