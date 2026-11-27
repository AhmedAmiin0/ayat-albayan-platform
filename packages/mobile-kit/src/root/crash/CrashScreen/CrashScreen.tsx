import { View } from 'react-native';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { RetryButton } from '../../../ui/startup';
import type { CrashScreenProps } from './CrashScreen.types';
import { restartAfterCrash } from '../restart-after-crash';
import { S, TITLE, BODY, font } from './crash-screen.helpers';

/** May render outside the root's providers, so it reads nothing from them. */
export function CrashScreen({ retry }: CrashScreenProps) {
  const { color } = useTheme();
  return (
    <View
      testID="crash-screen"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        paddingHorizontal: 32,
        backgroundColor: color.cover,
      }}
    >
      <View accessible accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 8 }}>
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
          {S.title}
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
          {S.body}
        </AppText>
      </View>
      <RetryButton
        label={S.retry}
        onPress={() => void restartAfterCrash(retry)}
        fontFamily={font(type.ui[600])}
      />
    </View>
  );
}
