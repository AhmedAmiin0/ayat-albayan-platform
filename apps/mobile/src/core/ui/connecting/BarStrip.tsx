import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import type { BarPhase } from './bar-phase';
import { ConnectingDots } from './ConnectingDots';

/** The OS text size scales the bar's words up to this: the strip's height is fixed (it animates). */
const MAX_SCALE = 1.2;
const TITLE = type.size.sm;
const HINT = type.size.xs;

/** The strip's height per phase: one line, or two with the hint, at the largest text it allows. */
export const stripHeight = (phase: BarPhase) =>
  Math.ceil((type.lineHeight(TITLE) + (phase === 'check' ? type.lineHeight(HINT) : 0)) * MAX_SCALE) + 6;

type Shown = Exclude<BarPhase, 'hidden'>;

/** «جارٍ الاتصال…» on the action wash with the pulsing nuqat; «تم الاتصال» on the success wash. */
export function BarStrip({ phase, still }: { phase: Shown; still: boolean }) {
  const { color } = useTheme();
  const done = phase === 'connected';
  const ink = done ? color.ok : color.lapis;
  const title = done ? t.mobile.connection.connected : t.mobile.connection.connecting;
  return (
    <View
      testID="connecting-bar"
      accessible
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={phase === 'check' ? `${title} ${t.mobile.connection.checkInternet}` : title}
      style={{
        height: stripHeight(phase),
        backgroundColor: done ? color.okSoft : color.lapisWash,
        borderBottomWidth: 1,
        borderBottomColor: color.rule,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 16,
      }}
    >
      {done ? <NuqtaGlyph shape="fill" color={ink} size={10} /> : <ConnectingDots color={ink} still={still} />}
      <View>
        <AppText maxFontSizeMultiplier={MAX_SCALE} style={{ color: ink, fontFamily: type.ui[600], fontSize: TITLE, lineHeight: type.lineHeight(TITLE) }}>
          {title}
        </AppText>
        {phase === 'check' ? (
          <AppText maxFontSizeMultiplier={MAX_SCALE} style={{ color: color.ink2, fontFamily: type.ui[400], fontSize: HINT, lineHeight: type.lineHeight(HINT) }}>
            {t.mobile.connection.checkInternet}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
