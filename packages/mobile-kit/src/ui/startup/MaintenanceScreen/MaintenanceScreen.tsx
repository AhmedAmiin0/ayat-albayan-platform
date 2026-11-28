import { View } from 'react-native';
import { ConnectingDots } from '../../connecting/ConnectingDots';
import { AppText } from '../../primitives/AppText';
import { type, useTheme } from '../../../theme';
import type { MaintenanceScreenProps } from './MaintenanceScreen.types';
import { RetryButton } from '../RetryButton';
import { StartupEmblem } from '../StartupEmblem';
import { S, TITLE, BODY } from './maintenance-screen.helpers';
import { useMaintenanceScreen } from './use-maintenance-screen';

export function MaintenanceScreen(props: MaintenanceScreenProps) {
  const { color } = useTheme();
  const { checking, onRetry, font, still, words, outage } = useMaintenanceScreen(props);
  return (
    <View
      testID="maintenance-screen"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.cover,
        paddingHorizontal: 32,
      }}
    >
      <StartupEmblem still={still || !outage} />
      <View
        accessible
        accessibilityLiveRegion="polite"
        style={{ marginTop: 24, alignItems: 'center', gap: 8 }}
      >
        <AppText
          accessibilityRole="header"
          style={{
            textAlign: 'center',
            color: color.coverInk,
            fontFamily: font(type.display),
            fontSize: TITLE,
            lineHeight: type.lineHeight(TITLE, true),
          }}
        >
          {words.title}
        </AppText>
        <AppText
          style={{
            textAlign: 'center',
            color: color.ink2,
            fontFamily: font(type.ui[400]),
            fontSize: BODY,
            lineHeight: type.lineHeight(BODY),
          }}
        >
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
