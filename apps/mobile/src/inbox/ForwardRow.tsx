import type { ThreadView } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Avatar } from '@/ui/Avatar';
import { CheckIcon } from './chat-icons';
import { initialOf } from './format';
import { chatName } from './forward-text';

export interface ForwardRowProps {
  thread: ThreadView;
  checked: boolean;
  /** Five are picked already: this one cannot join (the counter says why). */
  disabled: boolean;
  onToggle: (thread: ThreadView) => void;
}

/**
 * One chat in the forward picker, a 56pt checkbox row. Outside its 24 h window it says so but stays
 * selectable: the server decides, and answers «skipped» with the reason.
 */
export function ForwardRow({ thread: th, checked, disabled, onToggle }: ForwardRowProps) {
  const { color } = useTheme();
  const name = chatName(th);
  const closed = !th.session_open;
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
        borderBottomWidth: 1,
        borderBottomColor: color.rule,
        opacity: disabled ? 0.45 : 1,
        backgroundColor: pressed || checked ? color.lapisWash : color.raised,
      })}
    >
      <Avatar letter={initialOf(th.display_name)} />
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
}
