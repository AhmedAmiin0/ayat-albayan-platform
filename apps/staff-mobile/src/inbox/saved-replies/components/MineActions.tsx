import type { SavedReply } from '@ab/shared';
import { t, useTheme, IconButton } from '@ab/mobile-kit';
import { EditIcon, TrashIcon } from '@/inbox/shared/chat-icons';

export function EditDelete({ reply, onEdit, onDelete }: { reply: SavedReply; onEdit: () => void; onDelete: () => void }) {
  const { color } = useTheme();
  return (
    <>
      <IconButton label={t.savedReplies.editReply.replace('{title}', reply.title)} onPress={onEdit}>
        <EditIcon color={color.lapis} size={20} />
      </IconButton>
      <IconButton label={t.savedReplies.deleteReply.replace('{title}', reply.title)} onPress={onDelete}>
        <TrashIcon color={color.bad} size={20} />
      </IconButton>
    </>
  );
}
