import { memo } from 'react';
import { staffMaySend } from '@ab/client-core';
import type { ThreadView } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { CheckIcon } from '@/inbox/shared/chat-icons';
import { chatName } from '@/inbox/thread/hooks/forward-text';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';

interface ForwardRowProps {
  thread: ThreadView;
  checked: boolean;
  /** Five are picked already: this one cannot join (the counter says why). */
  disabled: boolean;
  onToggle: (thread: ThreadView) => void;
}

/**
 * One chat in the forward picker, a 56pt checkbox row. Where a text cannot go (the text rule,
 * owner 2026-11-01) it says so but stays selectable: the server decides, and answers «skipped»
 * with the reason.
 */
export const ForwardRow = memo(function ForwardRow({ thread: th, checked, disabled, onToggle }: ForwardRowProps) {
  const { color } = useTheme();
  const name = chatName(th);
  const staff = useThreadMode().kind !== 'teacher';
  const chat = { open: th.session_open, tryAfterWindow: th.try_after_window };
  const closed = !staffMaySend(chat, staff);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={name}
      accessibilityHint={closed ? t.inbox.forward.skip.session_closed : undefined}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onToggle(th)}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        opacity: disabled ? 0.45 : 1,
        // The list's inset card draws the fill and the rules (owner 2026-10-28: one container rule).
        backgroundColor: pressed || checked ? color.lapisWash : 'transparent',
      })}
    >
      <Avatar name={th.display_name ?? ''} id={th.phone_e164} decorative />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText
          numberOfLines={1}
          style={{
            fontFamily: type.ui[600],
            fontSize: type.size.body,
            lineHeight: type.lineHeight(type.size.body),
            color: color.ink,
          }}
        >
          {name}
        </AppText>
        {closed ? (
          <AppText
            numberOfLines={2}
            style={{
              fontFamily: type.ui[400],
              fontSize: type.size.xs,
              lineHeight: type.lineHeight(type.size.xs),
              color: color.ink3,
            }}
          >
            {t.inbox.forward.skip.session_closed}
          </AppText>
        ) : null}
      </View>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: shape.radius.pill,
          borderWidth: 1.5,
          borderColor: checked ? color.lapisFill : color.ruleInput,
          backgroundColor: checked ? color.lapisFill : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <CheckIcon color={color.onLapis} size={16} /> : null}
      </View>
    </Pressable>
  );
});
