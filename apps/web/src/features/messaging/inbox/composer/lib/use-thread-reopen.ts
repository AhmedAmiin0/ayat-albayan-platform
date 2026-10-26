import type { ReopenTemplateOutcome, ThreadView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { reopenThread } from '../../api/api';

// «إعادة فتح المحادثة» (owner 2026-10-26): opening a thread whose 24 h window is closed asks the
// server once per thread per app session (it dedupes per day anyway). Lives in the composer, which
// mounts only for the thread a staff member opened: never on list scroll or a prefetch.

/** Phones asked this app session → the answer (null while it is on its way or when it failed). */
const asked = new Map<string, ReopenTemplateOutcome | null>();

/** Tests only: a fresh app session. */
export function forgetReopens(): void {
  asked.clear();
}

/** The note above the composer, or null (nothing was asked, or nothing for this user to see). */
export function reopenNote(outcome: ReopenTemplateOutcome | null): string | null {
  if (outcome === 'template_queued') return t.inbox.reopen.requested;
  if (outcome === 'already_requested_today') return t.inbox.reopen.requestedToday;
  return null;
}

export function useThreadReopen(thread: Pick<ThreadView, 'phone_e164' | 'session_open'>): ReopenTemplateOutcome | null {
  const phone = thread.phone_e164;
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState(() => asked.get(phone) ?? null);
  // Decided at the open (the composer is keyed by phone): a window that ends while the chat is on screen asks nothing.
  const [closed] = useState(() => !thread.session_open);
  useEffect(() => {
    if (!closed || asked.has(phone)) return;
    asked.set(phone, null);
    void (async () => {
      try {
        const { template } = await reopenThread(phone);
        asked.set(phone, template);
        setOutcome(template);
        // The queued template shows in the log like any sent one.
        if (template === 'template_queued') await queryClient.invalidateQueries({ queryKey: ['threads', 'detail', phone] });
      } catch {
        // Failed: no note, and not asked again this session (the server logs its side).
      }
    })();
  }, [closed, phone, queryClient]);
  return outcome;
}
