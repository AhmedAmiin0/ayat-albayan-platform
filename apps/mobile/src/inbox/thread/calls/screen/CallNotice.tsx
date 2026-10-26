import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { CloseIcon } from '../../../shared/chat-icons';

/** A notice goes by itself after this long (ms), like the chat's. */
export const CALL_NOTICE_MS = 6000;

/** A call's short notice (a refused microphone, a failed call, «أُرسل طلب الإذن»), over the bottom of any screen. */
export function CallNotice({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const timer = setTimeout(onDismiss, CALL_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [text, onDismiss]);
  return (
    <View
      testID="call-notice"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', start: 12, end: 12, bottom: insets.bottom + 16, flexDirection: 'row', alignItems: 'center', gap: 4, paddingStart: 14, borderRadius: shape.radius.md, backgroundColor: color.inverse }}
    >
      <AppText style={{ flex: 1, fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.onInverse }}>{text}</AppText>
      <IconButton label={t.common.close} onPress={onDismiss}>
        <CloseIcon color={color.onInverse} />
      </IconButton>
    </View>
  );
}
