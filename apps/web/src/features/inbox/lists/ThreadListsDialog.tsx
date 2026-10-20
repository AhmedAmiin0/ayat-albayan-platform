import type { ChatListRef } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { chatListsQuery } from './api';
import { CreateListDialog } from './CreateListDialog';
import { useMembership } from './use-membership';

const L = t.inbox.lists;

export interface ThreadListsDialogProps {
  phone: string;
  /** The lists the chat is in now (ThreadDetail.lists). */
  lists: readonly ChatListRef[];
  onClose: () => void;
}

/**
 * «القوائم» of one chat (docs/22 §4): every list as a checkbox (checked = the chat is in it), saved on
 * each toggle, then «قائمة جديدة», which creates a list and adds the chat to it in one go.
 */
export function ThreadListsDialog({ phone, lists, onClose }: ThreadListsDialogProps) {
  const all = useQuery(chatListsQuery);
  const { member, toggle, failed } = useMembership(phone, lists);
  const [creating, setCreating] = useState(false);
  if (creating) {
    return (
      <CreateListDialog
        onClose={() => setCreating(false)}
        onCreated={(list) => {
          toggle(list.id, true);
          setCreating(false);
        }}
      />
    );
  }
  const close = (
    <Button type="button" variant="ghost" onClick={onClose}>
      {t.common.close}
    </Button>
  );
  return (
    <Dialog layout="center" title={L.title} onClose={onClose} actions={close}>
      <div className="grid gap-3">
        {all.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
        {all.isError && <FormAlert>{L.loadError}</FormAlert>}
        {all.data?.length === 0 && <p className="text-sm text-ink-3">{L.none}</p>}
        {all.data && all.data.length > 0 && (
          <ul aria-label={L.title} className="grid gap-1">
            {all.data.map((l) => (
              <li key={l.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-rule px-3 text-sm hover:bg-sunk sm:min-h-10">
                  <input
                    type="checkbox"
                    checked={member.has(l.id)}
                    onChange={(e) => toggle(l.id, e.target.checked)}
                    className="size-4 shrink-0 accent-[var(--lapis)]"
                  />
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {failed && <FormAlert>{L.saveError}</FormAlert>}
        <Button type="button" variant="secondary" className="justify-self-start" onClick={() => setCreating(true)}>
          <Icon name="plus" />
          {L.new}
        </Button>
      </div>
    </Dialog>
  );
}
