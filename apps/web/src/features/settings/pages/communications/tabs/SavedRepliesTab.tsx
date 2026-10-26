import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Icon } from '@/components/ui/display/icon';
import { Skeleton } from '@/components/ui/display/skeleton';
import { usePermissions } from '@/features/auth/use-permissions';
import { savedRepliesQuery } from '@/features/inbox/saved-replies/api';
import { useReplyDialogs } from '@/features/inbox/saved-replies/use-reply-dialogs';
import { t } from '@/lib/i18n/i18n';
import { SavedRepliesTable } from './SavedRepliesTable';

const S = t.savedReplies;

/**
 * «الردود السريعة» (owner 2026-10-25): the SHARED replies everyone with the chats inserts, in one
 * compact table (no scope column: every row is shared) with reorder, edit and delete; «رد جديد» opens the editor. Without
 * saved_replies.manage the table is read-only. Personal replies are managed from the chat's «ردودي».
 */
export function SavedRepliesTab() {
  const replies = useQuery(savedRepliesQuery);
  const manage = usePermissions().can('saved_replies.manage');
  const dialogs = useReplyDialogs('shared');
  const headingId = useId();
  const shared = (replies.data ?? []).filter((r) => r.scope === 'shared');
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h2 id={headingId} className="text-h4 font-bold">
            {S.title}
          </h2>
          <p className="text-sm text-ink-2">{S.manageIntro}</p>
        </div>
        {manage && (
          <Button type="button" onClick={dialogs.add}>
            <Icon name="plus" />
            {S.add}
          </Button>
        )}
      </div>
      {!manage && <p className="text-sm text-ink-2">{S.readOnly}</p>}
      {replies.isPending && (
        <div aria-busy="true" className="grid gap-2 py-2">
          <span className="sr-only">{t.common.loading}</span>
          <Skeleton className="w-2/3" />
          <Skeleton className="w-1/2" />
        </div>
      )}
      <div aria-live="polite">
        {replies.isError && (
          <div className="grid justify-items-start gap-2">
            <FormAlert>{S.loadError}</FormAlert>
            <Button size="sm" variant="secondary" onClick={() => void replies.refetch()}>
              {S.retry}
            </Button>
          </div>
        )}
        {replies.data && shared.length === 0 && <p className="text-sm text-ink-2">{S.emptyShared}</p>}
      </div>
      {shared.length > 0 && <SavedRepliesTable labelledBy={headingId} replies={shared} manage={manage} onEdit={dialogs.edit} onDelete={dialogs.remove} />}
      {dialogs.dialogs}
    </section>
  );
}
