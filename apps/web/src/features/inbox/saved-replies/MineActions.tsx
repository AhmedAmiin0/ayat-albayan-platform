import type { SavedReply } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { t } from '@/lib/i18n';

const S = t.savedReplies;

/** «ردودي»'s «رد جديد» under the list (edit / delete sit on each row: RowActions). */
export function MineActions({ onAdd }: { onAdd: () => void }) {
  return (
    <Button type="button" size="sm" variant="secondary" onMouseDown={(e) => e.preventDefault()} onClick={onAdd}>
      <Icon name="plus" />
      {S.add}
    </Button>
  );
}

export interface RowActionsProps {
  reply: SavedReply;
  onEdit: (reply: SavedReply) => void;
  onDelete: (reply: SavedReply) => void;
}

/**
 * One «ردودي» row's own edit and delete, beside its option (never inside it): they act on that row,
 * whatever the highlight (a hover on the way, or a touch that never moves it).
 */
export function RowActions({ reply, onEdit, onDelete }: RowActionsProps) {
  return (
    <span className="flex shrink-0 items-center">
      <Button type="button" size="sm" variant="ghost" aria-label={S.editReply.replace('{title}', reply.title)} onClick={() => onEdit(reply)}>
        {t.common.edit}
      </Button>
      <IconButton label={S.deleteReply.replace('{title}', reply.title)} onClick={() => onDelete(reply)}>
        <Icon name="trash" className="size-5" />
      </IconButton>
    </span>
  );
}
