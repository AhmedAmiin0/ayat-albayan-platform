import { View } from 'react-native';
import { space } from '../../../theme';
import { AppearancePicker } from './AppearancePicker';

/**
 * The picker in the app direction and in an LTR frame. Choosing a segment switches the theme, so
 * the showcase itself shows light and dark; nothing moves, so reduced motion needs no variant.
 */
export function AppearancePickerShowcase() {
  return (
    <View style={{ gap: space[4], padding: space[4] }}>
      <AppearancePicker />
      <View style={{ direction: 'ltr' }}>
        <AppearancePicker />
      </View>
    </View>
  );
}
