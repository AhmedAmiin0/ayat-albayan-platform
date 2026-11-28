import { type ReactNode, useMemo, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, useWindowDimensions, View } from 'react-native';
import { t, shape, useTheme, useA11yPref, KeyboardFrame } from '@ab/mobile-kit';
import { dragClaims, dragCloses, dragOffset } from './sheet-drag';

/** Reduce Motion skips the slide; it rides the keyboard and never grows past the room above it. */
export function ReplySheetFrame(props: { onClose: () => void; children: ReactNode; tall?: boolean; name?: { testID: string; close: string } }) {
  const { onClose, children, tall = false, name } = props;
  const { color } = useTheme();
  const { height } = useWindowDimensions();
  const still = useA11yPref('reduceMotion');
  const testID = name?.testID ?? (tall ? 'quote-sheet' : 'saved-replies-sheet');
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
      <KeyboardFrame
        inScreen={false}
        testID={`${testID}-keyboard`}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={name?.close ?? (tall ? t.inbox.quote.close : t.savedReplies.sheetClose)}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: color.scrim }}
        />
        <Animated.View
          testID={testID}
          style={{
            height: Math.round(height * (tall ? 0.85 : 0.5)),
            maxHeight: '100%',
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
      </KeyboardFrame>
    </Modal>
  );
}
