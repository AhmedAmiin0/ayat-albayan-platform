import { CHANNEL_BODY_MAX } from '@ab/shared';
import type { ReactNode } from 'react';
import { Icon, FormAlert } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import type { Round } from './use-composer';

const c = t.studentChannel;

interface RoundProps {
  round: Round;
  disabled: boolean;
  onMic: () => void;
  onVoice: () => void;
}

/** Each face of the round button: its type, name, glyph and what a click does. */
const FACES: Readonly<Record<Round, { submit: boolean; label: string; glyph: ReactNode }>> = {
  send: { submit: true, label: c.send, glyph: <Icon name="send" /> },
  mic: { submit: false, label: c.media.record, glyph: <Icon name="mic" /> },
  voice: { submit: false, label: c.send, glyph: <Icon name="send" /> },
};

/**
 * The 48px round button at the composer's end: «أرسل» submits the form; while the box is empty it
 * is the microphone; while recording, «أرسل» stops and sends the note. The face crossfades.
 */
export function RoundAction(props: RoundProps) {
  const face = FACES[props.round];
  const clicks: Readonly<Record<Round, (() => void) | undefined>> = {
    send: undefined,
    mic: props.onMic,
    voice: props.onVoice,
  };
  return (
    <button
      type={face.submit ? 'submit' : 'button'}
      aria-label={face.label}
      disabled={props.disabled}
      onClick={clicks[props.round]}
      className="ab-press grid size-12 shrink-0 animate-fade-in place-items-center rounded-full bg-primary text-primary-foreground hover:not-disabled:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-5"
    >
      {face.glyph}
    </button>
  );
}

/** A key cap of the hint line. */
const Key = ({ children }: { children: string }) => (
  <kbd className="rounded-sm border border-rule bg-page px-1 font-sans text-[0.6875rem] text-ink-2">
    {children}
  </kbd>
);

/** «Enter للإرسال، Shift + Enter لسطر جديد», where there is a keyboard (never on a phone). */
export function ComposerHint() {
  return (
    <p className="flex flex-wrap items-center gap-1 text-2xs text-ink-3 pointer-coarse:hidden">
      <Key>Enter</Key> {c.web.sendKey} <Key>Shift</Key> + <Key>Enter</Key> {c.web.lineKey}
    </p>
  );
}

interface NotesProps {
  /** The send's or the file's refusal in words. */
  problem: string | null;
  tooLong: boolean;
  /** The microphone was refused. */
  denied: boolean;
  uploading: boolean;
}

/** The lines over the composer: the refusal, «أطول من 2000 حرف», the microphone, the upload. */
export function ComposerNotes({ problem, tooLong, denied, uploading }: NotesProps) {
  return (
    <>
      {problem && <FormAlert>{problem}</FormAlert>}
      {tooLong && <FormAlert>{c.tooLong.replace('{n}', String(CHANNEL_BODY_MAX))}</FormAlert>}
      {denied && <FormAlert>{c.web.micDenied}</FormAlert>}
      {uploading && (
        <p role="status" className="text-xs text-ink-3">
          {c.media.uploading}
        </p>
      )}
    </>
  );
}
