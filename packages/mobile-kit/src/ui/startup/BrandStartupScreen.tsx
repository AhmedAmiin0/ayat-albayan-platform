import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { useA11yPref } from '../primitives/use-a11y-pref';
import { Wordmark } from '../primitives/Wordmark';
import { motion, useTheme } from '../../theme';
import type { StartupBrand } from './startup-brand';
import type { StartupMode } from './startup-mode';
import { StartupStatus } from './StartupStatus';
import { useStartupStage } from './use-startup-stage';

/** The native splash's image at its size, in the window's exact centre; the screen's one label. */
function CentredMark({ brand }: { brand: StartupBrand }) {
  const size = brand.markSize;
  return (
    <View
      style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
      accessible
      accessibilityState={{ busy: true }}
      accessibilityLabel={`${brand.title} — ${t.mobile.connection.loading}`}
    >
      <Image
        testID="startup-mark"
        source={brand.mark}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    </View>
  );
}

/** Between the mark's foot and the wordmark. */
const GAP = 20;

interface BrandStartupScreenProps {
  brand: StartupBrand;
  mode: StartupMode;
  onRetry: () => void;
  fontsLoaded: boolean;
}

/**
 * An app's own startup cover (docs/50, the family app): the native splash's image at its size in
 * the window's exact centre, on its colour, so the hand-off from the native splash shows no jump.
 * The wordmark fades in under it (opacity only, also under Reduce Motion); then the same status
 * and «إعادة المحاولة» as the staff cover, in the brand's ink. Nothing turns: no spinner.
 */
export function BrandStartupScreen(props: BrandStartupScreenProps) {
  const { brand, mode, onRetry, fontsLoaded } = props;
  const { name } = useTheme();
  const tone = brand.tone[name];
  const still = useA11yPref('reduceMotion');
  const { stage, restart } = useStartupStage(mode);
  const [shown] = useState(() => new Animated.Value(0));
  const font = (family: string) => (fontsLoaded ? family : undefined);
  const reveal = () =>
    Animated.timing(shown, { toValue: 1, duration: motion.base, useNativeDriver: true }).start();
  const retry = () => {
    restart();
    onRetry();
  };
  return (
    <View testID="startup-screen" style={{ flex: 1, backgroundColor: tone.background }}>
      <StatusBar style="light" />
      <CentredMark brand={brand} />
      <Animated.View
        onLayout={reveal}
        style={{
          position: 'absolute',
          top: '50%',
          start: 0,
          end: 0,
          marginTop: brand.markSize / 2 + GAP,
          paddingHorizontal: 32,
          alignItems: 'center',
          opacity: shown,
        }}
      >
        <Wordmark
          title={brand.title}
          subtitle={brand.subtitle}
          color={tone.ink}
          fontsLoaded={fontsLoaded}
        />
        <StartupStatus
          stage={stage}
          still={still}
          onRetry={retry}
          font={font}
          tone={{ text: tone.ink, dots: tone.accent }}
        />
      </Animated.View>
    </View>
  );
}
