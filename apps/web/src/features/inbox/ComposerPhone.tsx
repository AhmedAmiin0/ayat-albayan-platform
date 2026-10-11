import type { ThreadView } from '@ab/shared';
import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { sessionUntil } from './format';
import { replyFromText } from './reply-from';
import { SendRatingButton } from './SendRatingButton';
import { TemplateComposer } from './TemplateComposer';
import { TextComposer } from './TextComposer';
import type { PrefillContext } from './template-params';

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
 * The reply box of the full-screen chat on phones (< 640px, owner 2026-10-05): pinned under the
 * log above the home indicator: the notices in one line, then a one-line growing message box with
 * the template toggle before it and a round «أرسل» after it. Outside the 24 h window: templates only.
 */
export function ComposerPhone({ thread, context, gateNote, mode, onMode, teacher }: ComposerPhoneProps) {
  const open = thread.session_open;
  const windowNote = open ? (thread.last_inbound_at ? sessionUntil(thread.last_inbound_at) : null) : t.inbox.sessionClosed;
  const notes = [open ? null : windowNote, gateNote, open ? windowNote : null, replyFromText(thread)].filter(
    (n): n is string => !!n,
  );
  const template = !open || mode === 'template';
  const toggle = open && (
    <IconButton
      label={t.inbox.composer.modeTemplate}
      aria-pressed={mode === 'template'}
      className={cn('rounded-full', mode === 'template' && 'bg-lapis-wash text-lapis')}
      onClick={() => onMode(mode === 'template' ? 'text' : 'template')}
    >
      <Icon name="template" className="size-5" />
    </IconButton>
  );

  return (
    <div className="grid max-h-[70dvh] shrink-0 gap-1.5 overflow-y-auto border-t border-rule bg-page px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <Notices notes={notes} />
      {!open && <SendRatingButton thread={thread} />}
      {template && toggle && <div className="flex">{toggle}</div>}
      {template ? (
        <TemplateComposer phone={thread.phone_e164} context={context} teacher={teacher} />
      ) : (
        <TextComposer phone={thread.phone_e164} compact leading={toggle} />
      )}
    </div>
  );
}
