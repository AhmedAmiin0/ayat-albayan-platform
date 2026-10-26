import { useEffect, useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { ConnectingDots } from '../connecting/ConnectingDots';
import { RetryButton } from './RetryButton';
import type { StartupStage } from './startup-mode';

/** Always reserved under the status, so nothing moves when the hint and the retry come. */
export const RETRY_AREA = 112;
const STATUS = type.size.body;
const HINT = type.size.sm;

/** Words and the retry appear with a short opacity fade (also under Reduce Motion: no movement). */
function FadeIn({ children, gap = 0 }: { children: ReactNode; gap?: number }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={{ opacity, alignItems: 'center', gap }}>{children}</Animated.View>;
}

export interface StartupStatusProps {
  stage: StartupStage;
  still: boolean;
  onRetry: () => void;
  /** Maps a font family to undefined until the bundled fonts are registered. */
  font: (family: string) => string | undefined;
}

/** «جارٍ الاتصال» with the gold dots (the live region), then from 10 s the hint and «إعادة المحاولة». */
export function StartupStatus({ stage, still, onRetry, font }: StartupStatusProps) {
  const { color } = useTheme();
  const c = t.mobile.connection;
  const line = (size: number) => ({ fontSize: size, lineHeight: type.lineHeight(size), color: color.ink3, textAlign: 'center' as const });
  return (
    <>
      <View style={{ marginTop: 8, minHeight: type.lineHeight(STATUS), justifyContent: 'center' }}>
        {stage !== 'mark' ? (
          <FadeIn>
            <View accessible accessibilityLiveRegion="polite" accessibilityLabel={c.startupConnecting} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <AppText style={{ ...line(STATUS), fontFamily: font(type.ui[500]) }}>{c.startupConnecting}</AppText>
              <ConnectingDots color={color.gold} still={still} />
            </View>
          </FadeIn>
        ) : null}
      </View>
      <View testID="startup-retry-area" style={{ height: RETRY_AREA, paddingTop: 18, alignItems: 'center' }}>
        {stage === 'retry' ? (
          <FadeIn gap={14}>
            <AppText style={{ ...line(HINT), fontFamily: font(type.ui[400]) }}>{c.checkInternet}</AppText>
            <RetryButton label={c.retry} onPress={onRetry} fontFamily={font(type.ui[600])} />
          </FadeIn>
        ) : null}
      </View>
    </>
  );
}
