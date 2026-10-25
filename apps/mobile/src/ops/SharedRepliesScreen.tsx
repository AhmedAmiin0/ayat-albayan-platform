import type { SavedReply } from '@ab/shared';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { Screen } from '@/core/ui/layout/Screen';
import { DownIcon, TrashIcon, UpIcon } from '@/inbox/shared/chat-icons';
import { ErrorLine } from '@/inbox/ErrorLine';
import { useMoveReply, useSavedReplies } from '@/inbox/saved-replies/api';
import { DeleteConfirm } from '@/inbox/saved-replies/DeleteConfirm';
import { ReplyEditor } from '@/inbox/saved-replies/ReplyEditor';
import { replyError } from '@/inbox/saved-replies/reply-error';
import { ReplyRow } from '@/inbox/saved-replies/ReplyRow';
import { SubScreenHeader } from './SubScreenHeader';

/** «إلى الأعلى» / «إلى الأسفل» (none at the ends, none while a move is saving) and «احذف», 44pt each. */
function RowActions(p: { reply: SavedReply; first: boolean; last: boolean; busy: boolean; onMove: (d: 'up' | 'down') => void; onDelete: () => void }) {
  const { color } = useTheme();
  const name = (s: string) => s.replace('{title}', p.reply.title);
  return (
    <>
      <IconButton label={name(t.savedReplies.moveUp)} disabled={p.first || p.busy} onPress={() => p.onMove('up')}>
        <UpIcon color={color.lapis} size={20} />
      </IconButton>
      <IconButton label={name(t.savedReplies.moveDown)} disabled={p.last || p.busy} onPress={() => p.onMove('down')}>
        <DownIcon color={color.lapis} size={20} />
      </IconButton>
      <IconButton label={name(t.savedReplies.deleteReply)} onPress={p.onDelete}>
        <TrashIcon color={color.bad} size={20} />
      </IconButton>
    </>
  );
}

/**
 * «الردود السريعة» in «الإعدادات» (owner 2026-10-25): the SHARED list every inbox user sees, for
 * holders of saved_replies.manage (the entry is hidden otherwise; the API refuses anyway). A tap
 * edits a reply; up / down reorder it; «رد جديد» adds one at the end. Personal replies live in the chat.
 */
export function SharedRepliesScreen() {
  const replies = useSavedReplies();
  const move = useMoveReply();
  const [editing, setEditing] = useState<{ reply: SavedReply | null } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const shared = (replies.data ?? []).filter((r) => r.scope === 'shared');
  if (editing) {
    return (
      <Screen>
        <SubScreenHeader title={editing.reply ? t.savedReplies.editTitle : t.savedReplies.addTitle} />
        <ReplyEditor reply={editing.reply} scope="shared" onDone={() => setEditing(null)} />
      </Screen>
    );
  }
  return (
    <Screen>
      <SubScreenHeader title={t.savedReplies.title} />
      <View style={{ gap: 8, paddingBottom: 8 }}>
        <Note>{t.savedReplies.manageIntro}</Note>
        <Button variant="secondary" label={t.savedReplies.add} onPress={() => setEditing({ reply: null })} />
        {move.isError ? <ErrorLine message={replyError(move.error)} /> : null}
      </View>
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={shared}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <View>
            <ReplyRow
              reply={item}
              onPress={() => setEditing({ reply: item })}
              trailing={
                <RowActions
                  reply={item}
                  first={index === 0}
                  last={index === shared.length - 1}
                  busy={move.isPending}
                  onMove={(direction) => move.mutate({ id: item.id, direction })}
                  onDelete={() => setDeleting(item.id)}
                />
              }
            />
            {deleting === item.id ? <DeleteConfirm reply={item} onDone={() => setDeleting(null)} /> : null}
          </View>
        )}
        ListEmptyComponent={
          replies.isError ? (
            <ErrorState onRetry={() => void replies.refetch()} />
          ) : (
            <View style={{ padding: 16 }}>
              <Note>{replies.isPending ? t.common.loading : t.savedReplies.emptyShared}</Note>
            </View>
          )
        }
      />
    </Screen>
  );
}
