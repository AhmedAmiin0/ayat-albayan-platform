import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { ConnectingDots } from '../../connecting/ConnectingDots';
import { AppText } from '../../primitives/AppText';
import { RetryButton } from '../RetryButton';
import { FadeIn } from './FadeIn';
import { HINT, lineStyle, RETRY_AREA, STATUS } from './startup-status.helpers';
import type { StartupStatusProps } from './StartupStatus.types';

export function StartupStatus({ stage, still, onRetry, font }: StartupStatusProps) {
  const { color } = useTheme();
  const c = t.mobile.connection;
  return (
    <>
      <View style={{ marginTop: 8, minHeight: type.lineHeight(STATUS), justifyContent: 'center' }}>
        {stage !== 'mark' ? (
          <FadeIn>
            <View
              accessible
              accessibilityLiveRegion="polite"
              accessibilityLabel={c.startupConnecting}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <AppText style={{ ...lineStyle(STATUS, color.ink3), fontFamily: font(type.ui[500]) }}>
                {c.startupConnecting}
              </AppText>
              <ConnectingDots color={color.gold} still={still} />
            </View>
          </FadeIn>
        ) : null}
      </View>
      <View
        testID="startup-retry-area"
        style={{ height: RETRY_AREA, paddingTop: 18, alignItems: 'center' }}
      >
        {stage === 'retry' ? (
          <FadeIn gap={14}>
            <AppText style={{ ...lineStyle(HINT, color.ink3), fontFamily: font(type.ui[400]) }}>
              {c.checkInternet}
            </AppText>
            <RetryButton label={c.retry} onPress={onRetry} fontFamily={font(type.ui[600])} />
          </FadeIn>
        ) : null}
      </View>
    </>
  );
}
