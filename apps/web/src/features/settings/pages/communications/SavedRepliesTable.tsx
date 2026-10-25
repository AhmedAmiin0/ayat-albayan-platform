import type { SavedReply } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { moveReply, refreshReplies, replyErrorText, SAVED_REPLIES_KEY } from '@/features/inbox/saved-replies/api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CELL, TH } from './overview-table';

const S = t.savedReplies;

export interface SavedRepliesTableProps {
  /** The tab's heading id: the table's name. */
  labelledBy: string;
  /** The shared list, by position then title. */
  replies: readonly SavedReply[];
  /** saved_replies.manage: reorder, edit and delete; otherwise read-only. */
  manage: boolean;
  onEdit: (reply: SavedReply) => void;
  onDelete: (reply: SavedReply) => void;
}

/** One row per shared reply: order (up / down, no drag), title, the text on one line, file, actions. */
export function SavedRepliesTable({ labelledBy, replies, manage, onEdit, onDelete }: SavedRepliesTableProps) {
  const queryClient = useQueryClient();
  const move = useMutation({
    mutationFn: moveReply,
    onSuccess: (lists) => queryClient.setQueryData(SAVED_REPLIES_KEY, lists),
    // Another admin may have moved or deleted it meanwhile: show the list as it is now.
    onError: () => refreshReplies(queryClient),
  });
  const cols = [S.colTitle, S.colPreview, S.colAttachment];
  return (
    <div className="grid gap-2">
      {move.isError && <FormAlert>{replyErrorText(move.error)}</FormAlert>}
      <div className="overflow-x-auto">
        <table aria-labelledby={labelledBy} className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {manage && <th scope="col" className={TH}>{S.colOrder}</th>}
              {cols.map((label) => (
                <th key={label} scope="col" className={TH}>
                  {label}
                </th>
              ))}
              {manage && <th scope="col" className={TH}><span className="sr-only">{t.common.actions}</span></th>}
            </tr>
          </thead>
          <tbody>
            {replies.map((reply, i) => (
              <tr key={reply.id}>
                {manage && (
                  <td className={cn(CELL, 'whitespace-nowrap')}>
                    <IconButton label={S.moveUp.replace('{title}', reply.title)} disabled={i === 0 || move.isPending} onClick={() => move.mutate({ id: reply.id, direction: 'up' })}>
                      <Icon name="arrow-up" />
                    </IconButton>
                    <IconButton label={S.moveDown.replace('{title}', reply.title)} disabled={i === replies.length - 1 || move.isPending} onClick={() => move.mutate({ id: reply.id, direction: 'down' })}>
                      <Icon name="arrow-down" />
                    </IconButton>
                  </td>
                )}
                <th scope="row" className={cn(CELL, 'font-semibold')}>
                  <bdi>{reply.title}</bdi>
                </th>
                <td className={cn(CELL, 'text-ink-2')} title={reply.body}>
                  {/* A cell ignores max-width: the span keeps the text to one short line. */}
                  <span className="block max-w-80 truncate" dir="auto">
                    {reply.body}
                  </span>
                </td>
                <td className={CELL}>
                  {reply.attachment ? (
                    <span className="inline-flex items-center gap-1 text-ink-2" title={reply.attachment.name}>
                      <Icon name="paperclip" className="size-4" />
                      <span className="sr-only">{S.hasAttachment}</span>
                    </span>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                {manage && (
                  <td className={cn(CELL, 'whitespace-nowrap')}>
                    <Button type="button" size="sm" variant="ghost" aria-label={S.editReply.replace('{title}', reply.title)} onClick={() => onEdit(reply)}>
                      {t.common.edit}
                    </Button>
                    <IconButton label={S.deleteReply.replace('{title}', reply.title)} onClick={() => onDelete(reply)}>
                      <Icon name="trash" />
                    </IconButton>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
