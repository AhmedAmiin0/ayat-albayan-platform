import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { AppText } from '../../primitives/AppText';
import { type, useTheme } from '../../../theme';
import { StartupEmblem } from '../StartupEmblem';
import { StartupStatus } from '../StartupStatus';
import type { StartupScreenProps } from './StartupScreen.types';
import { TITLE } from './startup-screen.helpers';
import { useStartupScreen } from './use-startup-screen';

/** The retry and hint space is reserved from the start; still under Reduce Motion. */
export function StartupScreen({ mode, onRetry, fontsLoaded }: StartupScreenProps) {
  const { color } = useTheme();
  const { font, still, stage, retry } = useStartupScreen({ mode, onRetry, fontsLoaded });
  return (
    <View
      testID="startup-screen"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.cover,
        paddingHorizontal: 32,
      }}
    >
      <View
        accessible
        accessibilityState={{ busy: true }}
        accessibilityLabel={`${t.app.name} — ${t.mobile.connection.loading}`}
        style={{ alignItems: 'center' }}
      >
        <StartupEmblem still={still} />
        <AppText
          style={{
            marginTop: 32,
            textAlign: 'center',
            color: color.coverInk,
            fontFamily: font(type.display),
            fontSize: TITLE,
            lineHeight: type.lineHeight(TITLE, true),
          }}
        >
          {t.app.name}
        </AppText>
      </View>
      <StartupStatus stage={stage} still={still} onRetry={retry} font={font} />
    </View>
  );
}
