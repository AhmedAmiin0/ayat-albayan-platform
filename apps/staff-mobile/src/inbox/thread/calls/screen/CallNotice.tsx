import type { NoticeAction } from '@ab/client-core';
import { useEffect } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, shape, type, useTheme, AppText, IconButton, CloseIcon } from '@ab/mobile-kit';

/** A notice goes by itself after this long (ms), like the chat's; one with an action stays until closed. */
const CALL_NOTICE_MS = 6000;

interface CallNoticeProps {
  text: string;
  /** The microphone was refused for good; only the app's settings can allow it. */
  action: NoticeAction | null;
  onDismiss: () => void;
}

export function CallNotice({ text, action, onDismiss }: CallNoticeProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (action) return;
    const timer = setTimeout(onDismiss, CALL_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [text, action, onDismiss]);
  return (
    <View
      testID="call-notice"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', start: 12, end: 12, bottom: insets.bottom + 16, flexDirection: 'row', alignItems: 'center', gap: 4, paddingStart: 14, borderRadius: shape.radius.md, backgroundColor: color.inverse }}
    >
      <AppText
        style={{
          flex: 1,
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.onInverse,
        }}
      >
        {text}
      </AppText>
      {action === 'settings' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openSettings()}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
        >
          <AppText
            style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.inverseGold }}
          >
            {t.calls.mic.openSettings}
          </AppText>
        </Pressable>
      ) : null}
      <IconButton label={t.common.close} onPress={onDismiss}>
        <CloseIcon color={color.onInverse} />
      </IconButton>
    </View>
  );
}
