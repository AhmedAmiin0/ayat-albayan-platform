import type { SavedReply } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { EditIcon, TrashIcon } from '../chat-icons';

/** A reply's «عدّل» and «احذف» at the end of its row (44pt each), named with its title. */
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
