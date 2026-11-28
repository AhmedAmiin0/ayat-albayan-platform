import { View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { AppText } from '../primitives/AppText';
import { useA11yPref } from '../primitives/use-a11y-pref';
import { type, useTheme } from '../../theme';
import type { StartupMode } from './startup-mode';
import { StartupEmblem } from './StartupEmblem';
import { StartupStatus } from './StartupStatus';
import { useStartupStage } from './use-startup-stage';

const TITLE = 22;

interface StartupScreenProps {
  mode: StartupMode;
  onRetry: () => void;
  /**
   * Noto Sans Arabic is registered: before that the system Arabic font (an unknown family is an
   * error on iOS).
   */
  fontsLoaded: boolean;
}

/** The retry and hint space is reserved from the start; still under Reduce Motion. */
export function StartupScreen({ mode, onRetry, fontsLoaded }: StartupScreenProps) {
  const font = (family: string) => (fontsLoaded ? family : undefined);
  const { color } = useTheme();
  const still = useA11yPref('reduceMotion');
  const { stage, restart } = useStartupStage(mode);
  const retry = () => {
    restart();
    onRetry();
  };
  return (
    <View
      testID="startup-screen"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.cover, paddingHorizontal: 32 }}
    >
      <View
        accessible
        accessibilityState={{ busy: true }}
        accessibilityLabel={`${t.app.name} — ${t.mobile.connection.loading}`}
        style={{ alignItems: 'center' }}
      >
        <StartupEmblem still={still} />
        <AppText
          style={{ marginTop: 32, textAlign: 'center', color: color.coverInk, fontFamily: font(type.display), fontSize: TITLE, lineHeight: type.lineHeight(TITLE, true) }}
        >
          {t.app.name}
        </AppText>
      </View>
      <StartupStatus stage={stage} still={still} onRetry={retry} font={font} />
    </View>
  );
}
