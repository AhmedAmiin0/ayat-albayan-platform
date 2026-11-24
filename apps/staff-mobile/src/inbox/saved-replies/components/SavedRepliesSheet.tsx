import type { SavedReply, SavedReplyScope } from '@ab/shared';
import { type ReactNode, useState } from 'react';
import { FlatList, View } from 'react-native';
import { t, type, useTheme, AppText, Button, ErrorState } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { SearchField } from '@/core/ui/form/SearchField';
import { useSavedReplies } from '@/inbox/saved-replies/hooks/api';
import { ManageReplies } from '@/inbox/saved-replies/quick-list/ManageReplies';
import { QuickReplyRow } from '@/inbox/saved-replies/quick-list/QuickReplyRow';
import { filterReplies } from '@/inbox/saved-replies/lib/reply-text';
import { FILL_FRAME } from '@/inbox/saved-replies/quick-list/FillReplyForm';
import { ReplySheetFrame } from '@/inbox/saved-replies/quick-list/ReplySheetFrame';
import { ScopeTabs } from '@/inbox/saved-replies/quick-list/ScopeTabs';

interface SavedRepliesSheetProps {
  onClose: () => void;
  /** Fills the composer; nothing is sent. */
  onPick: (reply: SavedReply) => void;
  /** Shown in the same Modal since iOS presents one at a time. */
  form?: ReactNode;
}

/** Mounted only while open, so the list is fetched on demand. */
export function SavedRepliesSheet({ onClose, onPick, form }: SavedRepliesSheetProps) {
  const { color } = useTheme();
  const replies = useSavedReplies();
  const [tab, setTab] = useState<SavedReplyScope>('shared');
  const [query, setQuery] = useState('');
  const [manage, setManage] = useState(false);
  const shown = filterReplies(replies.data ?? [], { scope: tab, query });
  const empty = query ? t.savedReplies.noMatch : tab === 'shared' ? t.savedReplies.emptyShared : t.savedReplies.emptyMine;
  if (form) {
    return (
      <ReplySheetFrame onClose={onClose} tall name={FILL_FRAME}>
        {form}
      </ReplySheetFrame>
    );
  }
  return (
    <ReplySheetFrame onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <AppText accessibilityRole="header" style={{ fontFamily: type.ui[700], fontSize: type.size.lg, lineHeight: type.lineHeight(type.size.lg), color: color.ink }}>
          {t.savedReplies.title}
        </AppText>
        <Button variant="ghost" label={manage ? t.savedReplies.manageDone : t.savedReplies.manage} onPress={() => setManage((v) => !v)} />
      </View>
      {manage ? (
        <ManageReplies
          mine={filterReplies(replies.data ?? [], { scope: 'mine', query: '' })}
          state={replies.isError ? 'failed' : replies.isPending ? 'loading' : 'ready'}
        />
      ) : (
        <View style={{ flex: 1, gap: 8, paddingTop: 4 }}>
          <View style={{ gap: 8, paddingHorizontal: 16 }}>
            <SearchField label={t.savedReplies.search} onSearch={setQuery} delayMs={150} />
            <ScopeTabs value={tab} onChange={setTab} />
          </View>
          <FlatList
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            data={shown}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => <QuickReplyRow reply={item} query={query} onPress={() => onPick(item)} />}
            ListEmptyComponent={
              replies.isError ? (
                <ErrorState onRetry={() => void replies.refetch()} />
              ) : (
                <View style={{ gap: 4, padding: 16 }}>
                  <Note>{replies.isPending ? t.common.loading : empty}</Note>
                  {replies.isPending ? null : <Note>{t.savedReplies.slashHint}</Note>}
                </View>
              )
            }
          />
        </View>
      )}
    </ReplySheetFrame>
  );
}
