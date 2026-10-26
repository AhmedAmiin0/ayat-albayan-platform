import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { Mark } from '@/core/ui/primitives/Mark';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { usePulse } from '@/core/ui/primitives/use-pulse';
import { motion, type, useTheme } from '@/theme';
import { KhatamStar } from './KhatamStar';
import type { StartupMode } from './startup-mode';
import { useStartupStage } from './use-startup-stage';

const STAR = 168;
const MARK = 92;
const BREATH_MS = 1800;

/** Text and button appear with a short opacity fade (also under Reduce Motion: no movement). */
function FadeIn({ children }: { children: React.ReactNode }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: motion.base, useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={{ opacity, alignItems: 'center' }}>{children}</Animated.View>;
}

export interface StartupScreenProps {
  mode: StartupMode;
  /** «إعادة المحاولة»: ask for the session and the connection again. */
  onRetry: () => void;
  /** Noto Sans Arabic is registered: before that the system Arabic font (an unknown family is an error on iOS). */
  fontsLoaded: boolean;
}

/**
 * The branded wait before the first screen: the emblem breathing inside its slowly turning khatam,
 * the academy's name, then «جارٍ الاتصال…» and «إعادة المحاولة». The status area keeps its height
 * from the start, so nothing above it moves when the words come. Reduce Motion: all of it still.
 */
export function StartupScreen({ mode, onRetry, fontsLoaded }: StartupScreenProps) {
  const font = (family: string) => (fontsLoaded ? family : undefined);
  const { color } = useTheme();
  const still = useA11yPref('reduceMotion');
  const { stage, restart } = useStartupStage(mode);
  const breath = usePulse({ duration: BREATH_MS, still });
  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });
  const glow = breath.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });
  const retry = () => {
    restart();
    onRetry();
  };
  return (
    <View
      testID="startup-screen"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.margin, padding: 24 }}
    >
      <View
        accessible
        accessibilityState={{ busy: true }}
        accessibilityLabel={`${t.app.name} — ${t.mobile.connection.loading}`}
        style={{ alignItems: 'center' }}
      >
        <View style={{ width: STAR, height: STAR, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', opacity: glow }}>
            <KhatamStar size={STAR} color={color.gold} still={still} />
          </Animated.View>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Mark size={MARK} />
          </Animated.View>
        </View>
        <AppText
          style={{ marginTop: 12, textAlign: 'center', color: color.ink, fontFamily: font(type.display), fontSize: type.size.h4, lineHeight: type.lineHeight(type.size.h4, true) }}
        >
          {t.app.name}
        </AppText>
      </View>
      <View style={{ height: 108, marginTop: 12, alignItems: 'center', gap: 12 }}>
        {stage !== 'mark' ? (
          <FadeIn>
            <AppText accessibilityLiveRegion="polite" style={{ textAlign: 'center', color: color.ink3, fontSize: type.size.sm, fontFamily: font(type.ui[500]) }}>
              {t.mobile.connection.connecting}
            </AppText>
          </FadeIn>
        ) : null}
        {stage === 'retry' ? (
          <FadeIn>
            <Button variant="secondary" label={t.mobile.connection.retry} onPress={retry} />
          </FadeIn>
        ) : null}
      </View>
    </View>
  );
}
