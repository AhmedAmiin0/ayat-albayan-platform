import { reopenNoteKey, type ReopenState } from '@ab/client-core';
import type { ThreadReopenView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { refreshInbox } from '../thread/hooks/inbox-sync';
import { threadPath } from '../thread/hooks/thread-cache';

// «إعادة فتح المحادثة» (owner 2026-10-26): opening a chat whose 24 h window is closed asks the server
// once per thread per app session (it dedupes per day anyway). Lives in the composer, which mounts
// only on the chat a staff member opened: never on the list's scroll or a prefetch.

/** Phones asked this app session → the answer (null while it is on its way). */
const asked = new Map<string, ReopenState | null>();

/** Tests only: a fresh app session. */
export function forgetReopens(): void {
  asked.clear();
}

/** The note over the composer, or null (nothing asked, or nothing for this user to see). */
export function reopenNote(outcome: ReopenState | null): string | null {
  const key = reopenNoteKey(outcome);
  return key ? t.inbox.reopen[key] : null;
}

/** `closedNow`: the chat is known and its window is closed; read at the open only (a window ending on screen asks nothing). */
export function useThreadReopen(phone: string, closedNow: boolean): ReopenState | null {
  const client = useQueryClient();
  const [closed] = useState(closedNow);
  const [outcome, setOutcome] = useState(() => asked.get(phone) ?? null);
  useEffect(() => {
    if (!closed || asked.has(phone)) return;
    asked.set(phone, null);
    void (async () => {
      try {
        const { template } = await apiSend<ThreadReopenView>('POST', `${threadPath(phone)}/reopen`);
        asked.set(phone, template);
        setOutcome(template);
        // The queued template shows in the chat, and the chat in its lists, like any sent one.
        if (template === 'template_queued') await refreshInbox(client, phone);
      } catch {
        // Failed: say so (send it by hand), and not asked again this session (the server logs its side).
        asked.set(phone, 'failed');
        setOutcome('failed');
      }
    })();
  }, [closed, phone, client]);
  return outcome;
}
