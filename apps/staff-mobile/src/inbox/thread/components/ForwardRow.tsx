import { memo } from 'react';
import { staffMaySend } from '@ab/client-core';
import type { ThreadView } from '@ab/shared';
import { View } from 'react-native';
import { t, type, useTheme, AppText, Avatar, Checkbox } from '@ab/mobile-kit';
import { chatName } from '@/inbox/thread/hooks/forward-text';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { sendState } from '@/inbox/thread/hooks/chat-window';

interface ForwardRowProps {
  thread: ThreadView;
  checked: boolean;
  /** Five are picked already: this one cannot join (the counter says why). */
  disabled: boolean;
  onToggle: (thread: ThreadView) => void;
}

/**
 * One chat in the forward picker, a 56pt checkbox row. Where a text cannot go (the text rule,
 * see the composer) it says so but stays selectable: the server decides, and answers «skipped»
 * with the reason.
 */
export const ForwardRow = memo(function ForwardRow({
  thread: th,
  checked,
  disabled,
  onToggle,
}: ForwardRowProps) {
  const { color } = useTheme();
  const name = chatName(th);
  const staff = useThreadMode().kind !== 'teacher';
  // Uses the device clock, like the composer.
  const closed = !staffMaySend(sendState(th, new Date()), staff);
  return (
    // The list's inset card draws the rules; a picked chat keeps its wash.
    <View style={{ backgroundColor: checked ? color.lapisWash : 'transparent' }}>
      <Checkbox
        label={name}
        hint={closed ? t.inbox.forward.skip.session_closed : undefined}
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(th)}
        side="end"
        inset
      >
        <View
          style={{
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 8,
          }}
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
        </View>
      </Checkbox>
    </View>
  );
});
