import { WA_TEXT_MAX } from '@ab/shared';
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { controlClass } from '@/components/ui/form/input';
import { usePhone } from '@/components/ui/layout/use-narrow';
import { errorCode } from '@/features/schedule/api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { sendText } from './api';
import type { ComposerExtras } from './composer-extras';
import { sendsOnKey } from './composer-keys';
import { ComposerError } from './ComposerError';
import { draftGeneration, getDraft, requestIdFor, setDraft, subscribeDrafts } from './draft-store';
import { ownSendGeneration, recordOwnSend } from './own-send';
import { ReplyStrip } from './ReplyStrip';
import { sendErrorCode, sendErrorCodeText, sendErrorText } from './send-error';
import { useReplyTarget } from './use-reply-target';

/** A send, the message it answers («رد»), the tab-memory generations it started in and what follows it (never sent). */
type Sent = { phone: string; text: string; clientRequestId: string; replyTo?: string | undefined; gen: { draft: number; own: number }; after?: () => void };

/** The box's tallest height (about five lines), then it scrolls. */
const COMPACT_MAX_PX = 128;

export interface TextComposerProps {
  phone: string;
  /** Sits before the box (the template toggle). */
  leading?: ReactNode;
  /** «الردود السريعة» (saved-replies/ReplyComposer): its panel and chip above the row, its keys first, its file after the text. */
  extras?: ComposerExtras;
}

/**
 * A session message (H3), only inside the 24 h window: one auto-growing line with a round send icon
 * button. Each send gets its own clientRequestId at submit; a failed one is kept with its id and
 * reason, and only that same text sent again reuses it (rule 8): any successful send for the chat,
 * or the box no longer holding that text, forgets it. The draft lives in draft-store (a thread switch
 * or a remount keeps it, with the failure's line); the box empties at once on send and text typed
 * meanwhile is never wiped. While this chat's send is in flight no box for it can send (mutationKey),
 * even one mounted since. A send settling after a sign-out writes nothing back (generations).
 * «رد» (owner 2026-10-25): the quoted strip above the box; a sent answer clears it, a failed one keeps it.
 */
export function TextComposer({ phone, leading, extras }: TextComposerProps) {
  const queryClient = useQueryClient();
  const errorId = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const desktop = !usePhone();
  const draft = useSyncExternalStore(subscribeDrafts, () => getDraft(phone));
  const reply = useReplyTarget(area);
  const text = draft.text;
  const write = (next: string) => {
    const { failed } = getDraft(phone);
    setDraft(phone, { text: next, failed: failed?.text === next.trim() ? failed : null });
  };
  const mutationKey = ['inbox-send', phone];
  const send = useMutation({
    mutationKey,
    mutationFn: ({ phone: to, text: body, clientRequestId, replyTo }: Sent) =>
      sendText({ phone: to, text: body, clientRequestId, ...(replyTo ? { replyToMessageId: replyTo } : {}) }),
    onSuccess: async (view, sent) => {
      recordOwnSend(sent.phone, view.id, sent.gen.own);
      if (sent.replyTo) reply.done(sent.replyTo);
      const now = getDraft(sent.phone);
      if (now.failed) setDraft(sent.phone, { ...now, failed: null }, sent.gen.draft);
      sent.after?.();
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onError: async (e, sent) => {
      // Put the message back with its key, unless she has typed a new one since (that one gets its own).
      const now = getDraft(sent.phone);
      const failed = { text: sent.text, id: sent.clientRequestId, code: sendErrorCode(e) };
      setDraft(sent.phone, { text: now.text || sent.text, failed }, sent.gen.draft);
      // The window may have closed since the page loaded: refetch so the composer switches.
      if (errorCode(e) === 'session_closed') await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onSettled: () => area.current?.focus(),
  });
  const pending = useIsMutating({ mutationKey }) > 0;
  // The box grows with its text (1 line → about 5), also where `field-sizing` is missing.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, COMPACT_MAX_PX)}px`;
  }, [text]);
  const tooLong = text.length > WA_TEXT_MAX;
  // The failure's line follows the draft (a box mounted since the send still says why), else this box's.
  // Not a stored session_closed: this box mounts only while the window is open, and the closed-window
  // notice replaces it while it is not (round 3).
  const stored = draft.failed?.code === 'session_closed' ? null : draft.failed;
  const failedHere = !pending && stored?.text === text.trim() ? sendErrorCodeText(stored.code) : null;
  const local = send.isError && !pending ? sendErrorText(send.error) : null;
  const error = tooLong ? t.inbox.composer.tooLong : (failedHere ?? local);
  const blocked = !text.trim() || tooLong || pending;
  const submit = () => {
    if (blocked) return;
    const gen = { draft: draftGeneration(), own: ownSendGeneration() };
    const body = text.trim();
    const sent = { phone, text: body, clientRequestId: requestIdFor(draft, body), replyTo: reply.replyTo, gen, after: extras?.onSubmit?.() };
    setDraft(phone, { text: '', failed: null });
    send.mutate(sent);
  };

  return (
    <form
      className="grid gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <ReplyStrip returnFocus={area} />
      {extras?.above}
      <div className="flex items-end gap-1.5">
        {leading}
        <textarea
          ref={area}
          aria-label={t.inbox.composer.messageLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder={desktop ? t.inbox.composer.placeholderDesktop : t.inbox.composer.placeholder}
          rows={1}
          value={text}
          onChange={(e) => write(e.target.value)}
          // Desktop: Enter sends, Shift+Enter is a new line. Phones: Enter is a new line. Ctrl/⌘+Enter always sends.
          {...extras?.boxProps}
          onKeyDown={(e) => {
            if (extras?.onKey?.(e) || !sendsOnKey(e, desktop)) return;
            e.preventDefault();
            submit();
          }}
          className={cn(controlClass, 'min-h-11 min-w-0 flex-1 resize-none rounded-[22px] py-2.5 leading-normal')}
        />
        <IconButton
          type="submit"
          label={t.inbox.composer.send}
          disabled={blocked}
          aria-busy={pending || undefined}
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
        >
          <Icon name="send" className="size-5" />
        </IconButton>
      </div>
      {error && <ComposerError id={errorId} text={error} />}
    </form>
  );
}
