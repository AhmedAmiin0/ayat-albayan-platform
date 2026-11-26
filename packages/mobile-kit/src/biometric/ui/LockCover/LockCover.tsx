import { StyleSheet, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { useTheme } from '../../../theme';
import { Mark } from '../../../ui/primitives/Mark';

/**
 * The plain cover: while the flag is read, in the background before the 5 minutes (the app
 * switcher's snapshot sees only this), and after a sign-out until the sign-in shows.
 */
export function LockCover() {
  const { color } = useTheme();
  return (
    <View
      testID="biometric-cover"
      accessible
      accessibilityLabel={t.biometric.locked}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: color.margin, alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      <Mark size={88} />
    </View>
  );
}
