import type { SavedReply, SavedReplyScope } from '@ab/shared';
import { useState } from 'react';
import { FlatList, Modal, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills } from '@/ui/FilterPills';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SearchField } from '@/ui/SearchField';
import { useSavedReplies } from './api';
import { DeleteConfirm } from './DeleteConfirm';
import { EditDelete } from './MineActions';
import { ReplyEditor } from './ReplyEditor';
import { ReplyRow } from './ReplyRow';
import { filterReplies } from './reply-text';

export interface SavedRepliesSheetProps {
  /** Typed after «/» in the box (empty from the button). */
  initialQuery: string;
  onClose: () => void;
  /** Fills the composer; nothing is sent. */
  onPick: (reply: SavedReply) => void;
}

const TABS = (): { value: SavedReplyScope; label: string }[] => [
  { value: 'shared', label: t.savedReplies.tabShared },
  { value: 'mine', label: t.savedReplies.tabMine },
];

/**
 * «الردود السريعة» (owner 2026-10-25): a sheet with a search over titles and texts, the tabs
 * «المشتركة» / «ردودي» and 56pt rows in the served order (position, then title). A tap fills the
 * composer. «ردودي» also adds, edits and deletes the person's own replies; the shared list is
 * managed in «الإعدادات». Mounted only while open, so the list is fetched on demand.
 */
export function SavedRepliesSheet({ initialQuery, onClose, onPick }: SavedRepliesSheetProps) {
  const replies = useSavedReplies();
  const [tab, setTab] = useState<SavedReplyScope>('shared');
  const [query, setQuery] = useState(initialQuery);
  const [editing, setEditing] = useState<{ reply: SavedReply | null } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const shown = filterReplies(replies.data ?? [], { scope: tab, query });
  const empty = query ? t.savedReplies.noMatch : tab === 'shared' ? t.savedReplies.emptyShared : t.savedReplies.emptyMine;
  const title = editing ? (editing.reply ? t.savedReplies.editTitle : t.savedReplies.addTitle) : t.savedReplies.title;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen sheet>
        <ScreenHeader title={title} trailing={<Button variant="ghost" label={t.common.close} onPress={onClose} />} />
        {editing ? (
          <ReplyEditor reply={editing.reply} scope="mine" onDone={() => setEditing(null)} />
        ) : (
          <View style={{ flex: 1, gap: 8 }}>
            <SearchField label={t.savedReplies.search} initial={initialQuery} onSearch={setQuery} delayMs={150} />
            <FilterPills accessibilityLabel={t.savedReplies.listLabel} items={TABS()} value={tab} onChange={setTab} />
            {tab === 'mine' ? <Button variant="secondary" label={t.savedReplies.add} onPress={() => setEditing({ reply: null })} /> : null}
            <FlatList
              style={{ flex: 1, marginHorizontal: -16 }}
              keyboardShouldPersistTaps="handled"
              data={shown}
              keyExtractor={(r) => r.id}
              renderItem={({ item }) => (
                <View>
                  <ReplyRow
                    reply={item}
                    onPress={() => onPick(item)}
                    trailing={tab === 'mine' ? <EditDelete reply={item} onEdit={() => setEditing({ reply: item })} onDelete={() => setDeleting(item.id)} /> : null}
                  />
                  {deleting === item.id ? <DeleteConfirm reply={item} onDone={() => setDeleting(null)} /> : null}
                </View>
              )}
              ListEmptyComponent={
                replies.isError ? (
                  <ErrorState onRetry={() => void replies.refetch()} />
                ) : (
                  <View style={{ padding: 16 }}>
                    <Note>{replies.isPending ? t.common.loading : empty}</Note>
                  </View>
                )
              }
            />
          </View>
        )}
      </Screen>
    </Modal>
  );
}
