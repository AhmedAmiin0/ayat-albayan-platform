import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { shape, type, useTheme, type Palette } from '@/theme';
import type { BarPhase } from './bar-phase';
import { CheckBadge } from './CheckBadge';
import { ConnectingDots } from './ConnectingDots';

export type ShownPhase = Exclude<BarPhase, 'hidden'>;

const TITLE = type.size.sm;
const HINT = type.size.xs;
/** The dots and the badge sit in a box one title line high, so they centre on the first line. */
const LINE = type.lineHeight(TITLE);

/** The card's wash and its dots per phase (approved design, 2026-10-26). */
export function barLook(phase: ShownPhase, color: Palette) {
  if (phase === 'connected') return { bg: color.okSoft, ink: color.coverInk, dots: color.ok };
  if (phase === 'check') return { bg: color.actSoft, ink: color.ink2, dots: color.act };
  return { bg: color.neutralSoft, ink: color.ink2, dots: color.gold };
}

/** «جارٍ الاتصال…» with the gold dots; from 10 s the amber hint; «تم الاتصال» with its check badge. */
export function BarCard({ phase, still }: { phase: ShownPhase; still: boolean }) {
  const { color } = useTheme();
  const look = barLook(phase, color);
  const c = t.mobile.connection;
  const title = phase === 'connected' ? c.connected : c.connecting;
  return (
    <View
      testID="connecting-bar"
      accessible
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={phase === 'check' ? `${title} ${c.checkInternet}` : title}
      style={{
        marginTop: 12,
        marginHorizontal: 16,
        borderRadius: shape.radius.lg,
        paddingVertical: 9,
        paddingHorizontal: 14,
        flexDirection: 'row',
        gap: 10,
        alignItems: phase === 'check' ? 'flex-start' : 'center',
        backgroundColor: look.bg,
      }}
    >
      <View style={{ height: LINE, justifyContent: 'center' }}>
        {phase === 'connected' ? <CheckBadge still={still} /> : <ConnectingDots color={look.dots} still={still} />}
      </View>
      <View style={{ flexShrink: 1 }}>
        <AppText style={{ color: look.ink, fontFamily: type.ui[600], fontSize: TITLE, lineHeight: LINE }}>{title}</AppText>
        {phase === 'check' ? (
          <AppText style={{ color: color.act, fontFamily: type.ui[400], fontSize: HINT, lineHeight: type.lineHeight(HINT) }}>
            {c.checkInternet}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
