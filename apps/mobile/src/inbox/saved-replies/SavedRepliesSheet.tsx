import type { SavedReply, SavedReplyScope } from '@ab/shared';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { SearchField } from '@/core/ui/form/SearchField';
import { useSavedReplies } from './api';
import { ManageReplies } from './quick-list/ManageReplies';
import { QuickReplyRow } from './quick-list/QuickReplyRow';
import { filterReplies } from './reply-text';
import { ReplySheetFrame } from './quick-list/ReplySheetFrame';
import { ScopeTabs } from './quick-list/ScopeTabs';

export interface SavedRepliesSheetProps {
  onClose: () => void;
  /** Fills the composer; nothing is sent. */
  onPick: (reply: SavedReply) => void;
}

/**
 * The quick-replies button's sheet (owner 2026-10-26, as WhatsApp Business): a search over titles
 * and texts, «المشتركة / ردودي» as a segmented control and the same rows as the «/» list. A tap
 * fills the composer. Adding, editing and deleting her own replies sits behind «إدارة». Mounted only
 * while open, so the list is fetched on demand.
 */
export function SavedRepliesSheet({ onClose, onPick }: SavedRepliesSheetProps) {
  const { color } = useTheme();
  const replies = useSavedReplies();
  const [tab, setTab] = useState<SavedReplyScope>('shared');
  const [query, setQuery] = useState('');
  const [manage, setManage] = useState(false);
  const shown = filterReplies(replies.data ?? [], { scope: tab, query });
  const empty = query ? t.savedReplies.noMatch : tab === 'shared' ? t.savedReplies.emptyShared : t.savedReplies.emptyMine;
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
