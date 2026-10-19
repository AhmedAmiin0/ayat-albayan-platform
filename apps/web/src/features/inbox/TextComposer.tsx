import { WA_TEXT_MAX } from '@ab/shared';
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { controlClass } from '@/components/ui/input';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { usePhone } from '@/components/ui/use-narrow';
import { errorCode } from '@/features/schedule/api';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { sendText } from './api';
import { sendsOnKey } from './composer-keys';
import { getDraft, requestIdFor, setDraft, subscribeDrafts } from './draft-store';
import { recordOwnSend } from './own-send';

const ERRORS: Record<string, string | undefined> = t.inbox.error;

/** The API's reason in words (409 session_closed, 400 invalid_phone…; a bare 403 «غير مسموح لك بالإرسال»), else «لم تُرسل». */
export function sendErrorText(error: unknown): string {
  const code = errorCode(error);
  if (!code && error instanceof ApiError && error.status === 403) return t.inbox.error.forbidden;
  return ERRORS[code ?? ''] ?? t.inbox.error.send_failed;
}

/** The box's tallest height (about five lines), then it scrolls. */
const COMPACT_MAX_PX = 128;

export interface TextComposerProps {
  phone: string;
  /** Sits before the box (the template toggle). */
  leading?: ReactNode;
}

/**
 * A session message (H3), only inside the 24 h window: one auto-growing line with a round send icon
 * button. Each send gets its own clientRequestId at submit; a failed one is kept with its id, and only
 * that same text sent again reuses it (rule 8). The draft lives in draft-store (a thread switch or a
 * remount keeps it); the box empties at once on send and text typed meanwhile is never wiped. While
 * this chat's send is in flight no box for it can send (mutationKey), even one mounted since.
 */
export function TextComposer({ phone, leading }: TextComposerProps) {
  const queryClient = useQueryClient();
  const errorId = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const desktop = !usePhone();
  const draft = useSyncExternalStore(subscribeDrafts, () => getDraft(phone));
  const text = draft.text;
  const write = (next: string) => setDraft(phone, { ...getDraft(phone), text: next });
  const mutationKey = ['inbox-send', phone];
  const send = useMutation({
    mutationKey,
    mutationFn: sendText,
    onSuccess: async (view, sent) => {
      recordOwnSend(sent.phone, view.id);
      const now = getDraft(sent.phone);
      if (now.failed?.id === sent.clientRequestId) setDraft(sent.phone, { ...now, failed: null });
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onError: async (e, sent) => {
      // Put the message back with its key, unless she has typed a new one since (that one gets its own).
      const now = getDraft(sent.phone);
      setDraft(sent.phone, { text: now.text || sent.text, failed: { text: sent.text, id: sent.clientRequestId } });
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
  const error = tooLong ? t.inbox.composer.tooLong : send.isError ? sendErrorText(send.error) : null;
  const blocked = !text.trim() || tooLong || pending;
  const submit = () => {
    if (blocked) return;
    const sent = { phone, text: text.trim(), clientRequestId: requestIdFor(draft, text.trim()) };
    write('');
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
          onKeyDown={(e) => {
            if (!sendsOnKey(e, desktop)) return;
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
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{error}</span>
        </p>
      )}
    </form>
  );
}
