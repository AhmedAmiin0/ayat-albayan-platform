import { BottomSheet } from '@expo/ui';
import { ScrollView, View } from 'react-native';
import { space, type, useTheme } from '../../../theme';
import { AppText } from '../../primitives/AppText';
import type { SheetProps } from './Sheet.types';
import { useSheet } from './use-sheet';

/**
 * The one bottom sheet of the apps: the native sheet (@expo/ui), closed by a drag down, the scrim,
 * Android's back or the content's own action; the owner holds `open`.
 */
export function Sheet(props: SheetProps) {
  const { color } = useTheme();
  const { title, padding, snapPoints } = useSheet(props);
  return (
    <BottomSheet
      isPresented={props.open}
      onDismiss={props.onClose}
      snapPoints={snapPoints}
      containerColor={color[props.surface ?? 'raised']}
      scrimColor={color.scrim}
      contentPadding={padding}
      testID={props.testID}
    >
      <View accessibilityLabel={props.label} style={{ gap: space[3] }}>
        {props.title ? (
          <AppText
            ref={title}
            accessibilityRole="header"
            style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink }}
          >
            {props.title}
          </AppText>
        ) : null}
        {props.scroll ? (
          <ScrollView
            testID={`${props.testID}-scroll`}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: space[3] }}
          >
            {props.children}
          </ScrollView>
        ) : (
          props.children
        )}
      </View>
    </BottomSheet>
  );
}
