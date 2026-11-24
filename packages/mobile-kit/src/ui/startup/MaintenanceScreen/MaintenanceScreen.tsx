import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { ConnectingDots } from '../../connecting/ConnectingDots';
import { AppText } from '../../primitives/AppText';
import { useA11yPref } from '../../primitives/use-a11y-pref';
import { type, useTheme } from '../../../theme';
import type { MaintenanceScreenProps } from './MaintenanceScreen.types';
import { RetryButton } from '../RetryButton';
import { StartupEmblem } from '../StartupEmblem';

const S = t.maintenance;
const WORDS = { maintenance: S.planned, down: S.outage } as const;
const TITLE = 22;
const BODY = type.size.body;

export function MaintenanceScreen(props: MaintenanceScreenProps) {
  const { kind, checking, onRetry, fontsLoaded } = props;
  const font = (family: string) => (fontsLoaded ? family : undefined);
  const { color } = useTheme();
  const still = useA11yPref('reduceMotion');
  const words = WORDS[kind];
  const outage = kind === 'down';
  return (
    <View
      testID="maintenance-screen"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.cover, paddingHorizontal: 32 }}
    >
      <StartupEmblem still={still || !outage} />
      <View accessible accessibilityLiveRegion="polite" style={{ marginTop: 24, alignItems: 'center', gap: 8 }}>
        <AppText
          accessibilityRole="header"
          style={{ textAlign: 'center', color: color.coverInk, fontFamily: font(type.display), fontSize: TITLE, lineHeight: type.lineHeight(TITLE, true) }}
        >
          {words.title}
        </AppText>
        <AppText style={{ textAlign: 'center', color: color.ink2, fontFamily: font(type.ui[400]), fontSize: BODY, lineHeight: type.lineHeight(BODY) }}>
          {words.body}
        </AppText>
      </View>
      <View style={{ height: 24, justifyContent: 'center' }}>
        {outage ? <ConnectingDots color={color.gold} still={still} /> : null}
      </View>
      <RetryButton
        label={checking ? S.checking : S.retry}
        onPress={onRetry}
        fontFamily={font(type.ui[600])}
      />
    </View>
  );
}
