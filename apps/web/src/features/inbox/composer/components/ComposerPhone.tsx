import type { ChatFileProblem, ThreadView } from '@ab/shared';
import { useState } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { noneAllowedText, useNoneAllowed, type NoneReason } from '../lib/allowed-templates';
import { AttachButton } from './AttachButton';
import { FileComposer } from './FileComposer';
import { sessionUntil } from '../../format';
import { useInboxMode } from '../../shared/mode';
import { replyFromText } from '../lib/reply-from';
import { ReplyComposer } from '../../saved-replies/ReplyComposer';
import { SavedRepliesButton } from '../../saved-replies/SavedRepliesButton';
import { SendRatingButton } from '../../sales/SendRatingButton';
import { TemplateComposer } from './TemplateComposer';
import { TextComposer } from './TextComposer';
import type { PrefillContext } from '../lib/template-params';
import { useChatAccess } from '../../shared/use-chat-access';

export type ComposerMode = 'text' | 'template';

export interface ComposerPhoneProps {
  thread: ThreadView;
  context: PrefillContext;
  /** The send gate's note (queued until sending is on), already in words; null when open. */
  gateNote: string | null;
  mode: ComposerMode;
  onMode: (mode: ComposerMode) => void;
  /** A teacher's own chat number: the template list is the teacher's. */
  teacher: boolean;
}

/** The notices as one short line; a tap shows them all (the closed window's notice comes first). */
function Notices({ notes }: { notes: string[] }) {
  const [open, setOpen] = useState(false);
  if (notes.length === 0) return null;
  return (
    <button
      type="button"
      aria-expanded={open}
      title={t.inbox.noticeMore}
      onClick={() => setOpen((v) => !v)}
      className={cn('block w-full overflow-hidden px-1 text-start text-2xs text-ink-2', !open && 'max-h-[1.5em]')}
    >
      {notes.map((note) => (
        <span key={note} className={cn('block leading-[1.5em]', !open && 'truncate')}>
          {note}
        </span>
      ))}
    </button>
  );
}

/**
 * The notices, the closed window's first. The reply line before the open window's note (collapsed,
 * only the first shows); a template leaves from its own registry line (docs/12 §13.18), not
 * reply_line: no reply line in template mode. With no template allowed the help line replaces
 * «يجب أن ترسل قالبًا».
 */
function noticeLines(input: Pick<ComposerPhoneProps, 'thread' | 'gateNote' | 'mode'> & { noneAllowed: NoneReason | null }): string[] {
  const { thread, gateNote, mode, noneAllowed } = input;
  const open = thread.session_open;
  const until = open && thread.last_inbound_at ? sessionUntil(thread.last_inbound_at) : null;
  const closedNote = open || noneAllowed ? null : t.inbox.sessionClosed;
  const replyFrom = mode === 'text' ? replyFromText(thread) : null;
  return [closedNote, gateNote, replyFrom, until].filter((n): n is string => !!n);
}

/**
 * The reply box at every width (phones since owner 2026-10-05, desktop since W2): pinned under the
 * log: the notices in one line, then a one-line growing message box with the template toggle
 * before it and a round «أرسل» after it. Outside the 24 h window: templates only. Teacher and sales
 * with no template allowed get no toggle, and after the window one line on what they can do.
 * Staff (not teachers) also get a paperclip inside the window (D2): a picked file swaps the box for
 * FileComposer. The File lives here only (never in the draft store), for this chat only.
 * Staff also get «الردود السريعة» (ReplyComposer); after the window its button shows locked.
 */
export function ComposerPhone({ thread, context, gateNote, mode, onMode, teacher }: ComposerPhoneProps) {
  const open = thread.session_open;
  const noneAllowed = useNoneAllowed(teacher);
  const notes = noticeLines({ thread, gateNote, mode, noneAllowed });
  const { files, replies } = useChatAccess(useInboxMode());
  const [picked, setPicked] = useState<{ phone: string; file: File } | null>(null);
  const [problem, setProblem] = useState<ChatFileProblem | null>(null);
  const file = picked?.phone === thread.phone_e164 ? picked.file : null;
  const template = !open || (mode === 'template' && !noneAllowed);
  const toggle = open && !noneAllowed && (
    <IconButton
      label={t.inbox.composer.modeTemplate}
      aria-pressed={mode === 'template'}
      className={cn('rounded-full', mode === 'template' && 'bg-lapis-wash text-lapis')}
      onClick={() => onMode(mode === 'template' ? 'text' : 'template')}
    >
      <Icon name="template" className="size-5" />
    </IconButton>
  );
  // «الردود السريعة» after the window: shown locked with why (session messages only).
  const locked = !open && replies && <SavedRepliesButton locked />;
  const attach = open && files && (
    <AttachButton
      onPick={(next) => {
        setProblem(null);
        setPicked({ phone: thread.phone_e164, file: next });
      }}
      onProblem={setProblem}
    />
  );

  return (
    <div className="grid max-h-[70dvh] shrink-0 gap-1.5 overflow-y-auto border-t border-rule bg-page px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <Notices notes={notes} />
      {!open && <SendRatingButton thread={thread} />}
      {template && (toggle || locked) && <div className="flex gap-1.5">{toggle}{locked}</div>}
      {!open && noneAllowed ? (
        <p className="px-1 text-xs text-ink-2">{noneAllowedText(noneAllowed, t.inbox.composer.noAllowedHelp)}</p>
      ) : template ? (
        <TemplateComposer phone={thread.phone_e164} context={context} teacher={teacher} />
      ) : file ? (
        <FileComposer phone={thread.phone_e164} file={file} onDone={() => setPicked(null)} />
      ) : replies ? (
        <ReplyComposer thread={thread} context={context} leading={<>{toggle}{attach}</>} />
      ) : (
        <TextComposer phone={thread.phone_e164} leading={<>{toggle}{attach}</>} />
      )}
      {problem && !template && (
        <p role="alert" className="px-1 text-xs text-danger">
          {t.inbox.error[problem]}
        </p>
      )}
    </div>
  );
}
