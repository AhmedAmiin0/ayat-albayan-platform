import { WA_TEXT_MAX } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { controlClass } from '@/components/ui/input';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { errorCode } from '@/features/schedule/api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { sendText } from './api';

const ERRORS: Record<string, string | undefined> = t.inbox.error;

/** The API's reason in words (409 session_closed, 400 invalid_phone…), else «متبعتتش». */
export const sendErrorText = (error: unknown): string => ERRORS[errorCode(error) ?? ''] ?? t.inbox.error.send_failed;

/** The compact textarea's tallest height (about five lines), then it scrolls. */
const COMPACT_MAX_PX = 128;

export interface TextComposerProps {
  phone: string;
  /** Phones: one auto-growing line with a round send icon button; `leading` sits before it. */
  compact?: boolean;
  leading?: ReactNode;
}

/**
 * A session message (H3), only inside the 24 h window. One idempotency key per draft, kept
 * across a retry, so a double click or a lost response never sends it twice (rule 8).
 */
export function TextComposer({ phone, compact, leading }: TextComposerProps) {
  const queryClient = useQueryClient();
  const errorId = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const requestId = useRef(crypto.randomUUID());
  const send = useMutation({
    mutationFn: sendText,
    onSuccess: async () => {
      setText('');
      requestId.current = crypto.randomUUID();
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    // The window may have closed since the page loaded: refetch so the composer switches.
    onError: (e) => errorCode(e) === 'session_closed' && queryClient.invalidateQueries({ queryKey: ['threads'] }),
  });
  // The compact box grows with its text (1 line → about 5), also where `field-sizing` is missing.
  useLayoutEffect(() => {
    const el = area.current;
    if (!compact || !el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, COMPACT_MAX_PX)}px`;
  }, [compact, text]);
  const tooLong = text.length > WA_TEXT_MAX;
  const error = tooLong ? t.inbox.composer.tooLong : send.isError ? sendErrorText(send.error) : null;
  const blocked = !text.trim() || tooLong || send.isPending;
  const submit = () => {
    if (blocked) return;
    send.mutate({ phone, text: text.trim(), clientRequestId: requestId.current });
  };
  const box = (
    <textarea
      ref={area}
      aria-label={t.inbox.composer.messageLabel}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      placeholder={t.inbox.composer.placeholder}
      rows={compact ? 1 : 3}
      value={text}
      onChange={(e) => setText(e.target.value)}
      // Ctrl/⌘+Enter sends; Enter alone is a new line (Arabic messages are often several lines).
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          submit();
        }
      }}
      className={cn(
        controlClass,
        compact
          ? 'min-h-11 min-w-0 flex-1 resize-none rounded-[22px] py-2.5 leading-normal'
          : 'field-sizing-content min-h-[88px] py-2.5 leading-normal sm:min-h-[88px]',
      )}
    />
  );

  return (
    <form
      className={compact ? 'grid gap-1.5' : 'grid gap-2'}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {compact ? (
        <div className="flex items-end gap-1.5">
          {leading}
          {box}
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
      ) : (
        box
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{error}</span>
        </p>
      )}
      {!compact && (
        <div className="flex justify-end">
          <Button type="submit" disabled={blocked}>
            {send.isPending ? t.inbox.composer.sending : t.inbox.composer.send}
          </Button>
        </div>
      )}
    </form>
  );
}
