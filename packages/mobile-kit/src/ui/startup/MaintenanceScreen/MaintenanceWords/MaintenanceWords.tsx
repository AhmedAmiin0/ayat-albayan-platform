import { View } from 'react-native';
import { AppText } from '../../../primitives/AppText';
import { type, useTheme } from '../../../../theme';
import { BODY, TITLE } from '../maintenance-screen.helpers';
import type { MaintenanceWordsProps } from './MaintenanceWords.types';

export function MaintenanceWords({ title, body, font }: MaintenanceWordsProps) {
  const { color } = useTheme();
  return (
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
        {title}
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
        {body}
      </AppText>
    </View>
  );
}
