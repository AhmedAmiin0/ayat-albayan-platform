import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t, AppText, Button, shape, type, useTheme } from '@ab/mobile-kit';

interface RoomSheetProps {
  testID: string;
  title: string;
  /** «إغلاق»; absent when only the sheet's own buttons close it (the leave question). */
  onClose?: () => void;
  children: ReactNode;
}

/**
 * A panel over the room's foot (the participants, the leave question, the chat notice): the
 * page surface on the dark room, so the kit's buttons and confirms read as everywhere else.
 */
export function RoomSheet({ testID, title, onClose, children }: RoomSheetProps) {
  const { color, elevation } = useTheme();
  return (
    <View
      testID={testID}
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
          style={{ flex: 1, fontFamily: type.ui[600], fontSize: type.size.base, color: color.ink }}
        >
          {title}
        </AppText>
        {onClose ? <Button variant="ghost" label={t.common.close} onPress={onClose} /> : null}
      </View>
      {children}
    </View>
  );
}
