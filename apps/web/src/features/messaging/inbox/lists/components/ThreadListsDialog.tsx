import type { ChatListRef } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { chatListsQuery } from '@/features/messaging/inbox/lists/lib/api';
import { AutoListChip } from './AutoListNote';
import { CreateListDialog } from './CreateListDialog';
import { useMembership } from '@/features/messaging/inbox/lists/lib/use-membership';

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
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-rule px-3 py-1.5 text-sm hover:bg-sunk sm:min-h-10">
                  <input
                    type="checkbox"
                    checked={member.has(l.id)}
                    onChange={(e) => toggle(l.id, e.target.checked)}
                    aria-label={l.name}
                    aria-describedby={l.auto_rule ? `auto-chip-${l.id} auto-${l.id}` : undefined}
                    className="size-4 shrink-0 accent-[var(--lapis)]"
                  />
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate">{l.name}</span>
                      {l.auto_rule && <AutoListChip id={`auto-chip-${l.id}`} />}
                    </span>
                    {l.auto_rule && (
                      <span id={`auto-${l.id}`} className="text-xs text-ink-3">
                        {L.autoRule[l.auto_rule]}
                      </span>
                    )}
                  </span>
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
