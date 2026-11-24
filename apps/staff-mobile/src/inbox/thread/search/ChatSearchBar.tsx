import { canStep, searchStatus, type SearchStep } from '@ab/client-core';
import { TextInput, View } from 'react-native';
import { t, AppText, Chevron, IconButton, type, useTheme, useSmallText } from '@ab/mobile-kit';
import { DownIcon, UpIcon } from '@/inbox/shared/chat-icons';
import type { ChatSearchValue } from './search-context';

/** The header's own row (ChatHeader): 52pt, the back chevron's box at the screen's edge. */
const ROW = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 2,
  minHeight: 52,
  marginStart: -10,
} as const;
const FIELD = {
  flex: 1,
  minWidth: 0,
  minHeight: 44,
  fontFamily: type.ui[400],
  fontSize: type.size.base,
};

/** Up = older (higher in the chat), down = newer, as WhatsApp. */
const ARROWS: { dir: SearchStep; Icon: typeof UpIcon }[] = [
  { dir: 'older', Icon: UpIcon },
  { dir: 'newer', Icon: DownIcon },
];

export function ChatSearchBar({ search: s }: { search: ChatSearchValue }) {
  const { color } = useTheme();
  const small = useSmallText();
  const status = searchStatus(
    { ...s, index: s.state.index },
    { ...t.inbox.chatSearch, error: t.common.error },
  );
  return (
    <View testID="chat-search-bar" style={ROW}>
      <IconButton label={t.inbox.chatSearch.close} onPress={s.close}>
        <Chevron to="prev" color={color.ink} size={22} />
      </IconButton>
      <TextInput
        autoFocus
        value={s.state.text}
        onChangeText={s.type}
        onSubmitEditing={() => s.step('older')}
        submitBehavior="submit"
        returnKeyType="search"
        accessibilityLabel={t.inbox.chatSearch.label}
        placeholder={t.inbox.chatSearch.placeholder}
        placeholderTextColor={color.ink3}
        style={{ ...FIELD, color: color.ink }}
      />
      <AppText testID="chat-search-status" accessibilityLiveRegion="polite" numberOfLines={1} style={{ ...small, flexShrink: 1 }}>
        {status}
      </AppText>
      {ARROWS.map(({ dir, Icon }) => (
        <IconButton
          key={dir}
          compact
          label={t.inbox.chatSearch[dir]}
          disabled={!canStep(s.state.index, dir, s.total)}
          onPress={() => s.step(dir)}
        >
          <Icon color={color.lapis} />
        </IconButton>
      ))}
    </View>
  );
}
