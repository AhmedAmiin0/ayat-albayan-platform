import { type ReactNode, useMemo, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, useTheme } from '@/theme';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { dragClaims, dragCloses, dragOffset } from './sheet-drag';

/**
 * A short sheet over the composer (owner 2026-10-26, as WhatsApp): about half the screen, the chat
 * dimmed behind it. A tap on the dim, the system back or a drag down on the handle closes it. With
 * Reduce Motion it appears and goes without sliding. RN core only (no native module: OTA). `tall`
 * (the «عرض سعر» sheet, a form): most of the screen.
 */
export function ReplySheetFrame({ onClose, children, tall = false }: { onClose: () => void; children: ReactNode; tall?: boolean }) {
  const { color } = useTheme();
  const { height } = useWindowDimensions();
  const still = useA11yPref('reduceMotion');
  const [y] = useState(() => new Animated.Value(0));
  const pan = useMemo(() => {
    const back = () => Animated.spring(y, { toValue: 0, useNativeDriver: true }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => dragClaims(g.dy, g.dx),
      onPanResponderMove: (_e, g) => y.setValue(dragOffset(g.dy)),
      onPanResponderRelease: (_e, g) => (dragCloses(g.dy, g.vy) ? onClose() : back()),
      onPanResponderTerminate: () => back(),
    });
  }, [y, onClose]);
  return (
    <Modal visible transparent animationType={still ? 'none' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.savedReplies.sheetClose}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: color.scrim }}
        />
        <Animated.View
          testID={tall ? 'quote-sheet' : 'saved-replies-sheet'}
          style={{
            height: Math.round(height * (tall ? 0.85 : 0.5)),
            borderTopLeftRadius: shape.radius.lg + 4,
            borderTopRightRadius: shape.radius.lg + 4,
            backgroundColor: color.raised,
            transform: [{ translateY: y }],
          }}
        >
          <View {...pan.panHandlers} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 14 }}>
            <View style={{ width: 36, height: 5, borderRadius: shape.radius.pill, backgroundColor: color.ruleInput }} />
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
