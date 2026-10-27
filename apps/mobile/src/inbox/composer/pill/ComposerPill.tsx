import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { TemplateIcon } from '../../shared/chat-icons';
import { EmojiIcon } from '../../shared/composer-icons';
import { AttachFile } from '../AttachFile';
import { CameraButton } from '../attach/CameraButton';
import { ComposerInput, type Selection } from '../ComposerInput';
import { EmojiSheet } from '../emoji/EmojiSheet';
import { insertAt } from '../emoji/emoji-list';

export interface PillProps {
  phone: string;
  text: string;
  onText: (text: string) => void;
  /** The box lost focus (a tap on the chat): closes the «/» list. */
  onLeave?: (() => void) | undefined;
  /** Staff (not a teacher): paperclip and camera; a teacher gets the template icon instead. */
  staff: boolean;
  onTemplate: () => void;
  onReplies: () => void;
  onQuote?: (() => void) | undefined;
  onFileError: (message: string | null) => void;
}

/**
 * The pill's contents in reading order (owner 2026-10-27, WhatsApp Business): [emoji][text]
 * [paperclip][camera] for staff, the camera hidden while typing (as WhatsApp); [emoji][text][قالب]
 * for a teacher (no files). An emoji goes in at the caret through onText (the «/» check runs too).
 */
export function PillContents(p: PillProps) {
  const { color } = useTheme();
  const [emoji, setEmoji] = useState(false);
  const sel = useRef<Selection>({ start: p.text.length, end: p.text.length });
  const input = useRef<TextInput | null>(null);
  const pick = (e: string) => {
    const next = insertAt(p.text, sel.current, e);
    sel.current = { start: next.caret, end: next.caret };
    p.onText(next.text);
  };
  const close = () => {
    setEmoji(false);
    input.current?.focus();
  };
  return (
    <>
      <IconButton label={t.inbox.composer.emoji} onPress={() => setEmoji(true)}>
        <EmojiIcon color={color.ink3} />
      </IconButton>
      <ComposerInput value={p.text} onChange={p.onText} onBlur={p.onLeave} inputRef={input} onSelection={(s) => (sel.current = s)} />
      {p.staff ? (
        <>
          <AttachFile phone={p.phone} onError={p.onFileError} onTemplate={p.onTemplate} onReplies={p.onReplies} onQuote={p.onQuote} />
          {p.text.trim() === '' ? <CameraButton phone={p.phone} onError={p.onFileError} /> : null}
        </>
      ) : (
        <IconButton label={t.inbox.composer.sendTemplate} onPress={p.onTemplate}>
          <TemplateIcon color={color.lapis} />
        </IconButton>
      )}
      <EmojiSheet visible={emoji} onPick={pick} onClose={close} />
    </>
  );
}
