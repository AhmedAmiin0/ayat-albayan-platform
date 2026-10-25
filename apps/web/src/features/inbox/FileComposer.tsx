import { WA_CAPTION_MAX } from '@ab/shared';
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { controlClass } from '@/components/ui/form/input';
import { errorCode } from '@/features/schedule/api';
import { sizeText } from '@/features/students/recording-format';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { ChatUploadError, sendFile, uploadChatFile } from './api.files';
import { ComposerError } from './ComposerError';
import { ReplyStrip } from './ReplyStrip';
import { sendErrorCode, sendErrorCodeText } from './send-error';
import { sendStart, settleOwnSend } from './send-start';
import { useReplyTarget } from './use-reply-target';

type FileSend = { phone: string; clientRequestId: string; file: File; caption: string; replyTo?: string | undefined };

export interface FileComposerProps {
  phone: string;
  /** Picked by AttachButton; held by ComposerPhone only, never in the draft store. */
  file: File;
  /** Sent, or «إزالة الملف»: back to the message box. */
  onDone: () => void;
}

/** The name the family sees: ≤ 200 characters, keeping the end (the extension). */
const sentName = (file: File): string => file.name.trim().slice(-200) || file.type;

/** «تعذّر رفع الملف» for a failed storage PUT, else the API's reason. */
const fileErrorText = (e: unknown): string => sendErrorCodeText(e instanceof ChatUploadError ? e.code : sendErrorCode(e));

/** An image's thumbnail (an object URL, revoked on unmount) or the PDF's name and size. */
function Chip({ file }: { file: File }) {
  const url = useMemo(() => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  if (url) return <img src={url} alt={file.name} className="h-11 w-auto max-w-24 rounded-md border border-rule object-cover" />;
  return (
    <span className="flex min-w-0 items-center gap-1.5 rounded-md border border-rule bg-sunk px-2 py-1 text-xs text-ink-2">
      <Icon name="template" className="size-5" />
      <span className="min-w-0 truncate font-semibold" dir="auto">{file.name}</span>
      <span className="shrink-0 text-ink-3">{sizeText(file.size)}</span>
    </span>
  );
}

/**
 * Sends the picked image or PDF (D2) in place of the message box: the file's chip with «إزالة الملف»,
 * an optional caption and «أرسل». Upload then send; a failed send keeps its clientRequestId, so the
 * same file sent again is the same request (rule 8). It shares the chat's send lock with the message
 * box (mutationKey), and its result after a sign-out writes nothing back (sendStart generations).
 * «رد»: the quoted strip stays above it; the file answers that message, and a sent one clears it.
 */
export function FileComposer({ phone, file, onDone }: FileComposerProps) {
  const queryClient = useQueryClient();
  const errorId = useId();
  const [caption, setCaption] = useState('');
  const requestId = useRef(crypto.randomUUID());
  const captionBox = useRef<HTMLInputElement>(null);
  const reply = useReplyTarget(captionBox);
  const mutationKey = ['inbox-send', phone];
  const send = useMutation({
    mutationKey,
    mutationFn: async (s: FileSend) => {
      const path = await uploadChatFile({ phone: s.phone, requestId: s.clientRequestId, file: s.file });
      const text = s.caption.trim();
      const body = { phone: s.phone, clientRequestId: s.clientRequestId, path, filename: sentName(s.file), ...(s.replyTo ? { replyToMessageId: s.replyTo } : {}) };
      return sendFile(text ? { ...body, caption: text } : body);
    },
    onMutate: sendStart,
    onSuccess: async (view, s, start) => {
      settleOwnSend(s.phone, view.id, start);
      if (s.replyTo) reply.done(s.replyTo);
      onDone();
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onError: async (e) => {
      // The window may have closed since the page loaded: refetch so the composer switches.
      if (errorCode(e) === 'session_closed') await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
  const pending = useIsMutating({ mutationKey }) > 0;
  const error = send.isError && !pending ? fileErrorText(send.error) : null;

  return (
    <form
      className="grid gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        send.mutate({ phone, clientRequestId: requestId.current, file, caption, replyTo: reply.replyTo });
      }}
    >
      <ReplyStrip returnFocus={captionBox} />
      <div className="flex items-center gap-1.5">
        <Chip file={file} />
        <IconButton label={t.inbox.composer.removeFile} disabled={pending} className="rounded-full" onClick={onDone}>
          <Icon name="x" className="size-5" />
        </IconButton>
      </div>
      <div className="flex items-end gap-1.5">
        <input
          ref={captionBox}
          aria-label={t.inbox.composer.captionPlaceholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder={t.inbox.composer.captionPlaceholder}
          maxLength={WA_CAPTION_MAX}
          dir="auto"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className={cn(controlClass, 'min-h-11 min-w-0 flex-1 rounded-[22px]')}
        />
        <IconButton
          type="submit"
          label={t.inbox.composer.sendFile}
          disabled={pending}
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
