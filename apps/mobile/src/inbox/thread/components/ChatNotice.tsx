import { useEffect } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { useChatActions } from '../hooks/chat-actions';
import { CloseIcon } from '../../chat-icons';

/** A notice with nothing to read twice goes by itself after this long (ms). */
export const NOTICE_MS = 5000;

/**
 * The chat's short notice over the composer (owner 2026-10-25): why a jump found no original, what a
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
