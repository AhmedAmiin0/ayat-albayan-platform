import { View } from 'react-native';
import { space } from '../../../theme';
import { Button } from '../../primitives/Button';
import { ExpoHost } from './ExpoHost';
import { NativeSlot } from './NativeSlot';

/**
 * The host's states: the app's direction (RTL in Arabic) and a left-to-right value, each in the
 * current scheme (flip the device to dark). A host has no motion of its own, so reduced motion
 * changes nothing; the hosted button keeps its 44pt target, role and spoken name.
 */
export function ExpoHostShowcase() {
  return (
    <View style={{ gap: space[4] }}>
      <ExpoHost testID="showcase-rtl">
        <NativeSlot>
          <Button label="حفظ" onPress={() => undefined} />
        </NativeSlot>
      </ExpoHost>
      <ExpoHost testID="showcase-ltr" ltr>
        <NativeSlot>
          <Button label="+20 100 000 0000" variant="secondary" onPress={() => undefined} />
        </NativeSlot>
      </ExpoHost>
    </View>
  );
}
