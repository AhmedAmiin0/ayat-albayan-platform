import { View } from 'react-native';
import { ConnectingDots } from '../../connecting/ConnectingDots';
import { type, useTheme } from '../../../theme';
import type { MaintenanceScreenProps } from './MaintenanceScreen.types';
import { RetryButton } from '../RetryButton';
import { StartupEmblem } from '../StartupEmblem';
import { S } from './maintenance-screen.helpers';
import { MaintenanceWords } from './MaintenanceWords';
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
      <MaintenanceWords title={words.title} body={words.body} font={font} />
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
