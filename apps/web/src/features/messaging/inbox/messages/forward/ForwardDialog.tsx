import { FORWARD_MAX_TARGETS, type ForwardResponse, type MessageView, type ThreadView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { SearchInput } from '@/components/ui/form/search-input';
import { useDebounced } from '@/features/finance/pricing/use-debounced';
import { t } from '@/lib/i18n/i18n';
import { threadsQuery } from '../../api/api';
import { forwardMessage } from '../../api/api.forward';
import { ForwardList } from './ForwardList';

export interface ForwardDialogProps {
  message: MessageView;
  /** The chat it is in: not offered as a target. */
  from: string;
  onClose: () => void;
  /** The per-chat answer and the names the picker showed (for the toast). */
  onDone: (res: ForwardResponse, names: ReadonlyMap<string, string | null>) => void;
}

const max = String(FORWARD_MAX_TARGETS);

/**
 * «إعادة توجيه» (owner 2026-10-25): pick up to five chats, recent first, searched by name or number
 * (GET /threads, debounced). A chat outside its window can be picked; the server skips it and says
 * why. The same picks sent again (a retry after an error) reuse the request's id (rule 8).
 */
export function ForwardDialog({ message, from, onClose, onDone }: ForwardDialogProps) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const search = useDebounced(q.trim(), 300);
  const list = useQuery(threadsQuery(search ? { page: 1, q: search } : { page: 1 }));
  const [picked, setPicked] = useState<ReadonlyMap<string, string | null>>(new Map());
  const request = useRef({ key: '', id: '' });
  const send = useMutation({
    mutationFn: forwardMessage,
    onSuccess: async (res) => {
      onDone(res, picked);
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
  const full = picked.size >= FORWARD_MAX_TARGETS;
  const toggle = (th: ThreadView) => {
    const next = new Map(picked);
    if (next.has(th.phone_e164)) next.delete(th.phone_e164);
    else if (!full) next.set(th.phone_e164, th.display_name);
    setPicked(next);
  };
  const submit = () => {
    const targets = [...picked.keys()];
    if (targets.length === 0 || send.isPending) return;
    // The message is part of the key: one id is never reused for another message (dedup would replay it).
    const key = `${message.id}:${targets.join(',')}`;
    if (request.current.key !== key) request.current = { key, id: crypto.randomUUID() };
    send.mutate({ messageId: message.id, targets, clientRequestId: request.current.id });
  };
  const threads = (list.data?.items ?? []).filter((th) => th.phone_e164 !== from);
  const counter = t.inbox.forward.selected.replace('{count}', String(picked.size)).replace('{max}', max);

  return (
    <Dialog
      title={t.inbox.forward.title}
      onClose={onClose}
      layout="center"
      className="sm:max-w-[480px]"
      hint={
        <span aria-live="polite">
          {counter}
          {full && <span className="block">{t.inbox.forward.max.replace('{max}', max)}</span>}
        </span>
      }
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.inbox.forward.close}
          </Button>
          <Button disabled={picked.size === 0 || send.isPending} aria-busy={send.isPending || undefined} onClick={submit}>
            {send.isPending ? t.inbox.forward.sending : t.inbox.forward.send}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        {send.isError && <FormAlert>{t.inbox.forward.error}</FormAlert>}
        <SearchInput aria-label={t.inbox.forward.search} placeholder={t.inbox.forward.search} value={q} onChange={(e) => setQ(e.target.value)} />
        {list.isPending ? (
          <p className="text-sm text-ink-3">{t.inbox.forward.loading}</p>
        ) : list.isError ? (
          <FormAlert>{t.common.error}</FormAlert>
        ) : threads.length === 0 ? (
          <p className="text-sm text-ink-3">{t.inbox.forward.empty}</p>
        ) : (
          <ForwardList threads={threads} picked={picked} full={full} onToggle={toggle} />
        )}
      </div>
    </Dialog>
  );
}
