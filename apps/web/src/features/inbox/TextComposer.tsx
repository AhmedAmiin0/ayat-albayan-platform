import { WA_TEXT_MAX } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { controlClass } from '@/components/ui/input';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { errorCode } from '@/features/schedule/api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { sendText } from './api';

const ERRORS: Record<string, string | undefined> = t.inbox.error;

/** The API's reason in words (409 session_closed, 400 invalid_phone…), else «متبعتتش». */
export const sendErrorText = (error: unknown): string => ERRORS[errorCode(error) ?? ''] ?? t.inbox.error.send_failed;

/**
 * A session message (H3), only inside the 24 h window. One idempotency key per draft, kept
 * across a retry, so a double click or a lost response never sends it twice (rule 8).
 */
export function TextComposer({ phone }: { phone: string }) {
  const queryClient = useQueryClient();
  const errorId = useId();
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
  const tooLong = text.length > WA_TEXT_MAX;
  const error = tooLong ? t.inbox.composer.tooLong : send.isError ? sendErrorText(send.error) : null;
  const submit = () => {
    if (!text.trim() || tooLong || send.isPending) return;
    send.mutate({ phone, text: text.trim(), clientRequestId: requestId.current });
  };

  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        aria-label={t.inbox.composer.messageLabel}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder={t.inbox.composer.placeholder}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        // Ctrl/⌘+Enter sends; Enter alone is a new line (Arabic messages are often several lines).
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit();
          }
        }}
        className={cn(controlClass, 'field-sizing-content min-h-[88px] py-2.5 leading-normal sm:min-h-[88px]')}
      />
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{error}</span>
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={!text.trim() || tooLong || send.isPending}>
          {send.isPending ? t.inbox.composer.sending : t.inbox.composer.send}
        </Button>
      </div>
    </form>
  );
}
