import type { SavedReply } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { t } from '@/lib/i18n';

const S = t.savedReplies;

export interface MineActionsProps {
  /** The highlighted reply of «ردودي»: edit and delete act on it. */
  active: SavedReply | undefined;
  onAdd: () => void;
  onEdit: (reply: SavedReply) => void;
  onDelete: (reply: SavedReply) => void;
}

/** «ردودي»'s own management: «رد جديد», and edit / delete of the highlighted reply (outside the listbox). */
export function MineActions({ active, onAdd, onEdit, onDelete }: MineActionsProps) {
  return (
    <>
      <Button type="button" size="sm" variant="secondary" onMouseDown={(e) => e.preventDefault()} onClick={onAdd}>
        <Icon name="plus" />
        {S.add}
      </Button>
      {active && (
        <>
          <Button type="button" size="sm" variant="ghost" aria-label={S.editReply.replace('{title}', active.title)} onClick={() => onEdit(active)}>
            {t.common.edit}
          </Button>
          <IconButton label={S.deleteReply.replace('{title}', active.title)} onClick={() => onDelete(active)}>
            <Icon name="trash" className="size-5" />
          </IconButton>
        </>
      )}
    </>
  );
}
