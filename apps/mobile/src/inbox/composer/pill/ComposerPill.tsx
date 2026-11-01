import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { TemplateIcon } from '../../shared/chat-icons';
import { EmojiIcon } from '../../shared/composer-icons';
import { AttachFile } from '../AttachFile';
import { ComposerInput, type Selection } from '../ComposerInput';
import { EmojiSheet } from '../emoji/EmojiSheet';
import { insertAt } from '../emoji/emoji-list';
import { QuoteButton } from '../quote/QuoteButton';

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
  /** «عرض سعر» (staff with pricing.read); absent → no price tag in the bar. */
  onQuote?: (() => void) | undefined;
  onFileError: (message: string | null) => void;
}

/**
 * The pill's contents in reading order. Staff, as WhatsApp (owner 2026-10-29: «some typing options are
 * missing»): [emoji][text][«عرض سعر»][paperclip]; owner 2026-11-01: no camera in the bar (its tile
 * stays in the paperclip's sheet, as template and quick replies). Teacher: [emoji][text][قالب].
 * An emoji goes in at the caret through onText (the «/» check runs too). Staff's emoji panel also
 * has «GIF» and «ملصقات» (owner 2026-11-01): a pick is sent at once.
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
