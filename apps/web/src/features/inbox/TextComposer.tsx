import { WA_TEXT_MAX } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
import { clearDraft, getDraft, setDraft } from './draft-store';

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
 * button. One idempotency key per draft, kept across a retry, so a double click or a lost response
 * never sends it twice (rule 8). The draft lives in draft-store, so a thread switch keeps it; the
 * box empties at once on send, and text typed while the send is in flight is never wiped.
 */
export function TextComposer({ phone, leading }: TextComposerProps) {
  const queryClient = useQueryClient();
  const errorId = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const desktop = !usePhone();
  const [seed] = useState(() => getDraft(phone));
  const [text, setText] = useState(seed.text);
  // The box as typed now: the mutation's callbacks run after the POST, when `text` may be stale.
  const current = useRef(seed.text);
  const requestId = useRef(seed.requestId);
  const write = (next: string) => {
    current.current = next;
    setText(next);
    if (next) setDraft(phone, { text: next, requestId: requestId.current });
    else clearDraft(phone);
  };
  const send = useMutation({
    mutationFn: sendText,
    onSuccess: async () => {
      requestId.current = crypto.randomUUID();
      write(current.current);
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onError: async (e, sent) => {
      // Put the message back with its key, unless she has typed a new one (that one gets its own key).
      if (current.current) requestId.current = crypto.randomUUID();
      write(current.current || sent.text);
      // The window may have closed since the page loaded: refetch so the composer switches.
      if (errorCode(e) === 'session_closed') await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onSettled: () => area.current?.focus(),
  });
  // The box grows with its text (1 line → about 5), also where `field-sizing` is missing.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, COMPACT_MAX_PX)}px`;
  }, [text]);
  const tooLong = text.length > WA_TEXT_MAX;
  const error = tooLong ? t.inbox.composer.tooLong : send.isError ? sendErrorText(send.error) : null;
  const blocked = !text.trim() || tooLong || send.isPending;
  const submit = () => {
    if (blocked) return;
    const clientRequestId = requestId.current;
    write('');
    // The draft keeps its key while the send is in flight: a failure restores both.
    setDraft(phone, { text: '', requestId: clientRequestId });
    send.mutate({ phone, text: text.trim(), clientRequestId });
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
          aria-busy={send.isPending || undefined}
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
