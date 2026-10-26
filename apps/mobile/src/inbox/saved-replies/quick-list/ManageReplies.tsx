import type { SavedReply } from '@ab/shared';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { DeleteConfirm } from '../DeleteConfirm';
import { EditDelete } from '../MineActions';
import { ReplyEditor } from '../ReplyEditor';
import { ReplyRow } from '../ReplyRow';

/**
 * «إدارة» in the quick-replies sheet (owner 2026-10-26): her own replies with «رد جديد» and each row's
 * edit / delete, so the pick list itself stays clean as WhatsApp's. The shared list is managed in
 * «الإعدادات».
 */
export interface ManageRepliesProps {
  mine: SavedReply[];
  /** The list is still loading, or failed: said instead of «none yet». */
  state: 'ready' | 'loading' | 'failed';
}

const NOTE = { ready: () => t.savedReplies.emptyMine, loading: () => t.common.loading, failed: () => t.savedReplies.loadError };

export function ManageReplies({ mine, state }: ManageRepliesProps) {
  const [editing, setEditing] = useState<{ reply: SavedReply | null } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  if (editing) return <ReplyEditor reply={editing.reply} scope="mine" onDone={() => setEditing(null)} />;
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Button variant="secondary" label={t.savedReplies.add} onPress={() => setEditing({ reply: null })} />
      </View>
      <FlatList
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        data={mine}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <View>
            <ReplyRow
              reply={item}
              trailing={<EditDelete reply={item} onEdit={() => setEditing({ reply: item })} onDelete={() => setDeleting(item.id)} />}
            />
            {deleting === item.id ? <DeleteConfirm reply={item} onDone={() => setDeleting(null)} /> : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Note>{NOTE[state]()}</Note>
          </View>
        }
      />
    </View>
  );
}
