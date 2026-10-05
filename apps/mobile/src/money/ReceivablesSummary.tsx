import type { ReceivablesView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { money } from '@/payments/format';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { fxMissingText } from './receivables';

/** Total owed in the reporting currency, then each currency's own total; the FX gap if any. */
export function ReceivablesSummary({ view }: { view: ReceivablesView }) {
  const { color } = useTheme();
  const fx = fxMissingText(view.fx_missing);
  const small = {
    fontFamily: type.ui[500],
    fontSize: type.size.xs,
    lineHeight: type.lineHeight(type.size.xs),
    color: color.ink2,
    fontVariant: ['tabular-nums' as const],
  };
  return (
    <View
      style={{
        gap: 4,
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <AppText style={small}>{t.mobileMoney.owedTotal}</AppText>
      <AppText
        style={{
          fontFamily: type.ui[700],
          fontSize: type.size.lg,
          lineHeight: type.lineHeight(type.size.lg),
          color: color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {money(view.total, view.currency)}
      </AppText>
      {view.totals.length > 1
        ? view.totals.map((x) => (
            <AppText key={x.currency} style={small}>
              {money(x.owed, x.currency)}
            </AppText>
          ))
        : null}
      {fx ? <AppText style={{ ...small, color: color.act }}>{fx}</AppText> : null}
    </View>
  );
}
