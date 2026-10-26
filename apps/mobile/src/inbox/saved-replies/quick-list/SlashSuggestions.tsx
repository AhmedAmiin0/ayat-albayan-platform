import type { SavedReply } from '@ab/shared';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { shape, useTheme } from '@/theme';
import { useSavedReplies } from '../api';
import { QuickReplyRow } from './QuickReplyRow';
import { matchReplies } from '../reply-text';
import { type ReplyContact, useFillReply } from './use-fill-reply';

export interface SlashSuggestionsProps {
  /** What was typed after «/». */
  search: string;
  contact: ReplyContact;
  onFill: (text: string, reply: SavedReply) => void;
}

/** About five rows tall at most, never more than a third of the window (the keyboard is up). */
const MAX_ROWS = 5;
/** A row with its two lines of text. */
const ROW = 76;

/**
 * WhatsApp Business's «/» list (owner 2026-10-26), docked right over the composer: the chat stays in
 * view above it and the keyboard stays up (a tap on a row is handled, not a dismiss). Both tabs in
 * one list, filtered live by the box's text after «/»; scrolls inside itself past five rows.
 */
export function SlashSuggestions({ search, contact, onFill }: SlashSuggestionsProps) {
  const { color } = useTheme();
  const { height } = useWindowDimensions();
  const replies = useSavedReplies();
  const pick = useFillReply(contact, onFill);
  const shown = matchReplies(replies.data ?? [], search);
  const note = replies.isError
    ? t.savedReplies.loadError
    : replies.isPending
      ? t.common.loading
      : search
        ? t.savedReplies.noMatch
        : t.savedReplies.emptyShared;
  return (
    <View
      testID="slash-suggestions"
      accessibilityLabel={t.savedReplies.listLabel}
      style={{
        maxHeight: Math.min(MAX_ROWS * ROW, height / 3),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: color.rule,
        borderRadius: shape.radius.lg,
        backgroundColor: color.raised,
        overflow: 'hidden',
      }}
    >
      {shown.length ? (
        <FlatList
          keyboardShouldPersistTaps="always"
          data={shown}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <QuickReplyRow reply={item} query={search} onPress={() => pick(item)} />}
        />
      ) : (
        <View style={{ padding: 12 }}>
          <Note>{note}</Note>
        </View>
      )}
    </View>
  );
}
