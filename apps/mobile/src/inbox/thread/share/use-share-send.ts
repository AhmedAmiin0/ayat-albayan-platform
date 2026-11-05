import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { useUploadMaxBytes } from '@/core/lib/query/public-config';
import { refreshInbox, touchInbox } from '@/inbox/thread/hooks/inbox-sync';
import type { SharedFile } from './read-share';
import { type ShareResult, sendSharedFiles } from './send-shared';

export type FailedShare = Extract<ShareResult, { ok: false }>;

/** The send under way: «جارٍ إرسال {n} من {m}». */
export interface ShareStep {
  done: number;
  total: number;
}

/** What is left after a send: the chat it went to and the files it could not send. */
interface ShareOutcome {
  phone: string;
  failed: FailedShare[];
}

/** «جارٍ إرسال {n} من {m}». */
export const sendingText = (step: ShareStep): string =>
  t.inbox.share.sending.replace('{n}', String(step.done)).replace('{m}', String(step.total));

const isFailed = (r: ShareResult): r is FailedShare => !r.ok;

/**
 * The chooser's file send. Every sent row moves its chat up the cached lists (touchInbox) and the
 * chat refetches, as useSendFile does. Resolves with the files that failed ([] when all went).
 */
export function useShareSend() {
  const client = useQueryClient();
  const maxBytes = useUploadMaxBytes();
  const [step, setStep] = useState<ShareStep | null>(null);
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);
  const send = async (phone: string, items: readonly SharedFile[]): Promise<FailedShare[]> => {
    const onStep = (done: number, total: number) => setStep({ done, total });
    const results = await sendSharedFiles({ phone, items, maxBytes }, onStep);
    await Promise.all(results.flatMap((r) => (r.ok ? [touchInbox(client, r.row)] : [])));
    void refreshInbox(client, phone);
    const failed = results.filter(isFailed);
    setStep(null);
    setOutcome({ phone, failed });
    return failed;
  };
  return { send, step, outcome };
}
