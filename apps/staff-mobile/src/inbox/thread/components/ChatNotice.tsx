import { useEffect } from 'react';
import { View } from 'react-native';
import { t, shape, type, useTheme, AppText, IconButton, CloseIcon } from '@ab/mobile-kit';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';

/** A notice with nothing to read twice goes by itself after this long (ms). */
const NOTICE_MS = 5000;

/**
 * The chat's short notice over the composer: why a jump found no original, what a
 * forward did. Announced politely; one with details (each skipped chat and why) stays until ✕.
 */
export function ChatNotice() {
  const { color } = useTheme();
  const { notice, say } = useChatActions();
  const lasting = !!notice?.details?.length;
  useEffect(() => {
    if (!notice || lasting) return;
    const timer = setTimeout(() => say(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, lasting, say]);
  if (!notice) return null;
  const line = {
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: color.ink,
  };
  return (
    <View
      testID="chat-notice"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
        paddingStart: 12,
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.ruleStrong,
        backgroundColor: color.raised,
      }}
    >
      <View style={{ flex: 1, gap: 2, paddingVertical: 10 }}>
        <AppText style={{ ...line, fontFamily: type.ui[600] }}>{notice.text}</AppText>
        {notice.details?.map((d) => (
          <AppText key={d} style={{ ...line, fontFamily: type.ui[400], color: color.ink2 }}>
            {d}
          </AppText>
        ))}
      </View>
      <IconButton label={t.inbox.forward.close} onPress={() => say(null)}>
        <CloseIcon color={color.ink2} size={18} />
      </IconButton>
    </View>
  );
}
