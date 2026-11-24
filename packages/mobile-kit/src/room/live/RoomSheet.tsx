import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { AppText, Button } from '../../ui';
import { shape, type, useTheme } from '../../theme';

interface RoomSheetProps {
  testID: string;
  title: string;
  /** Absent when only the sheet's own buttons close it. */
  onClose?: () => void;
  children: ReactNode;
}

/**
 * A panel over the room's foot (the participants, the leave question, the chat notice): the page
 * surface on the dark room, over a scrim that takes the taps meant for the room behind. A modal
 * view for screen readers (until the @expo/ui BottomSheet replaces it).
 */
export function RoomSheet({ testID, title, onClose, children }: RoomSheetProps) {
  const { color, elevation } = useTheme();
  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        testID={`${testID}-scrim`}
        onStartShouldSetResponder={() => true}
        onResponderRelease={onClose}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]}
      />
      <View
        testID={testID}
        accessibilityViewIsModal
        style={{
          position: 'absolute',
          start: 0,
          end: 0,
          bottom: 0,
          maxHeight: '75%',
          padding: 16,
          gap: 12,
          borderTopStartRadius: shape.radius.lg,
          borderTopEndRadius: shape.radius.lg,
          backgroundColor: color.page,
          boxShadow: elevation.pop,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText
            accessibilityRole="header"
            style={{ flex: 1, fontFamily: type.ui[700], fontSize: 18, color: color.ink }}
          >
            {title}
          </AppText>
          {onClose ? <Button variant="ghost" label={t.common.close} onPress={onClose} /> : null}
        </View>
        {children}
      </View>
    </View>
  );
}
