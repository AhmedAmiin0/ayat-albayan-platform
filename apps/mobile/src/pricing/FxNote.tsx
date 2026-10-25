import { FX_ATTRIBUTION_URL } from '@ab/shared';
import { Linking, Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ltr } from '@/core/ui/primitives/Ltr';
import type { QuoteFx } from './use-quote';

const fx = t.pricing.fx;

/**
 * Where a USD price's rate came from (docs/08 §4): the rate's date, or that it is an older one
 * (API down), or the 3.75 peg. The date is the provider's UTC day, Western digits, no Intl.
 */
export function fxNotice(rate: QuoteFx): string {
  if (rate.fallback || rate.date === null) return fx.fallback;
  const day = ltr(rate.date.slice(0, 10));
  return (rate.ageHours === null ? fx.rateDate : fx.stale).replace('{date}', day);
}

/** The notice, then ExchangeRate-API's required attribution link (not for the peg). */
export function FxNote({ fx: rate }: { fx: QuoteFx }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Note>{fxNotice(rate)}</Note>
      {rate.fallback ? null : (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(FX_ATTRIBUTION_URL)}
          hitSlop={{ top: 12, bottom: 12 }}
          style={{ alignSelf: 'flex-start' }}
        >
          <AppText
            style={{
              fontFamily: type.ui[500],
              fontSize: type.size.xs,
              lineHeight: type.lineHeight(type.size.xs),
              color: color.lapis,
              textDecorationLine: 'underline',
            }}
          >
            {fx.attribution}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}
