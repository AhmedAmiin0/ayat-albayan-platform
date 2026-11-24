import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Skeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { usePermissions } from '@ab/web-kit/auth/use-permissions';
import { savedRepliesQuery } from '@/features/messaging/inbox/saved-replies/lib/api';
import { useReplyDialogs } from '@/features/messaging/inbox/saved-replies/hooks/use-reply-dialogs';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SavedRepliesTable } from './SavedRepliesTable';

const S = t.savedReplies;

/** Read-only without saved_replies.manage; personal replies are managed from the chat. */
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
