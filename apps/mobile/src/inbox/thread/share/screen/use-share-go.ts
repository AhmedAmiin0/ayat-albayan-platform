import type { ThreadView } from '@ab/shared';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { appendComposerText } from '@/inbox/composer/draft-store';
import type { SharedFile, SharedItems } from '@/inbox/thread/share/read-share';
import { useShareSend } from '@/inbox/thread/share/use-share-send';
import { threadLink, useThreadMode } from '@/inbox/thread/hooks/thread-mode';

export type ShareKind = 'text' | 'files';

export const shareKind = (items: SharedItems): ShareKind => (items.files.length > 0 ? 'files' : 'text');

/**
 * What the chooser's button does (docs/38 §mobile 8–11). Text: into the chat's box (never over her
 * draft), then the chat replaces the chooser; staff press send there. Files: one by one, then the
 * chat, or the chooser keeps the failed ones for «إعادة المحاولة» (same ids) and «فتح المحادثة».
 */
/** Whether the chooser is still on screen: a send that ends after she left never moves her. */
function useStillHere() {
  const here = useRef(true);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);
  return here;
}

export function useShareGo(items: SharedItems) {
  const here = useStillHere();
  const mode = useThreadMode();
  const base = useTreeBase();
  const sender = useShareSend();
  const openChat = (phone: string) => router.replace(inTree(base, threadLink(phone, mode)));
  const sendFiles = async (phone: string, files: readonly SharedFile[]) => {
    const failed = await sender.send(phone, files);
    if (failed.length === 0 && here.current) openChat(phone);
  };
  const ACT: Record<ShareKind, (phone: string) => void> = {
    text: (phone) => {
      appendComposerText(phone, items.text);
      openChat(phone);
    },
    files: (phone) => void sendFiles(phone, items.files),
  };
  const go = (picked: ThreadView) => ACT[shareKind(items)](picked.phone_e164);
  const outcome = sender.outcome;
  const retry = () => {
    if (!outcome) return;
    void sendFiles(outcome.phone, outcome.failed.map((f) => f.item));
  };
  const open = () => {
    if (!outcome) return;
    openChat(outcome.phone);
  };
  return { go, step: sender.step, outcome, actions: { retry, open } };
}
