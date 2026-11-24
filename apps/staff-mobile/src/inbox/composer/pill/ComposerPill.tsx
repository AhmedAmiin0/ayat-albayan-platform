import { useRef, useState } from 'react';
import { t, useTheme, IconButton, EmojiIcon, insertAt } from '@ab/mobile-kit';
import { TemplateIcon } from '@/inbox/shared/chat-icons';
import { AttachFile } from '@/inbox/composer/AttachFile';
import { ComposerInput, type Selection } from '@/inbox/composer/ComposerInput';
import { EmojiSheet } from '@/inbox/composer/emoji/EmojiSheet';
import { QuoteButton } from '@/inbox/composer/quote/QuoteButton';
import { useEditFocus } from '@/inbox/composer/edit/use-edit-focus';

export interface PillProps {
  phone: string;
  text: string;
  onText: (text: string) => void;
  /** The box lost focus (a tap on the chat): closes the «/» list. */
  onLeave?: (() => void) | undefined;
  /** Staff (not a teacher): the price tag and the paperclip; a teacher gets emoji and template icons. */
  staff: boolean;
  onTemplate: () => void;
  /** Tried after the 24 h window (owner 2026-10-31): a plain, not highlighted, template icon. */
  quietTemplate?: boolean;
  onReplies: () => void;
  /** Absent means no price tag in the bar. */
  onQuote?: (() => void) | undefined;
  onFileError: (message: string | null) => void;
}

/** An emoji is inserted at the caret through onText so the slash check runs too. */
export function PillContents(p: PillProps) {
  const { color } = useTheme();
  const [emoji, setEmoji] = useState(false);
  const sel = useRef<Selection>({ start: p.text.length, end: p.text.length });
  const input = useEditFocus();
  const pick = (e: string) => {
    const next = insertAt(p.text, sel.current, e);
    sel.current = { start: next.caret, end: next.caret };
    p.onText(next.text);
  };
  const close = () => {
    setEmoji(false);
    input.current?.focus();
  };
  const box = <ComposerInput value={p.text} onChange={p.onText} onBlur={p.onLeave} inputRef={input} onSelection={(s) => (sel.current = s)} />;
  const media = p.staff ? { phone: p.phone, onError: p.onFileError } : undefined;
  const sheet = <EmojiSheet visible={emoji} onPick={pick} onClose={close} media={media} />;
  const smile = (
    <IconButton label={t.inbox.composer.emoji} onPress={() => setEmoji(true)} compact>
      <EmojiIcon color={color.ink3} />
    </IconButton>
  );
  if (p.staff) {
    return (
      <>
        {smile}
        {box}
        {p.onQuote ? <QuoteButton onPress={p.onQuote} compact /> : null}
        <AttachFile
          phone={p.phone}
          onError={p.onFileError}
          onTemplate={p.onTemplate}
          onReplies={p.onReplies}
          onEmoji={() => setEmoji(true)}
        />
        {sheet}
      </>
    );
  }
  return (
    <>
      {smile}
      {box}
      <IconButton label={t.inbox.composer.sendTemplate} onPress={p.onTemplate}>
        <TemplateIcon color={p.quietTemplate ? color.ink3 : color.lapis} />
      </IconButton>
      {sheet}
    </>
  );
}
