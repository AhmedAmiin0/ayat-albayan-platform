import { useRef, type KeyboardEvent } from 'react';
import { ChatGlyph } from '@ab/web-kit/components/channel/bubble/ChatGlyph';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { IconButton } from '@ab/web-kit/components/ui/form/IconButton';
import { useDismiss } from '@ab/web-kit/components/ui/overlay/use-dismiss';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { AttachMenu } from '@ab/web-kit/components/channel/composer/AttachMenu';
import { EmojiPanel } from '@ab/web-kit/components/channel/composer/EmojiPanel';
import type { Panel, useComposer } from '@ab/web-kit/components/channel/composer/use-composer';
import { pickedFile } from '@ab/web-kit/components/channel/composer/use-send-file';

const c = t.studentChannel;
const PILL =
  'relative flex min-h-12 flex-1 items-end gap-1 rounded-3xl border border-rule-input bg-raised ' +
  'px-1 focus-within:border-lapis';

/** Esc in the box only leaves the box (never closes the panel around the chat). */
function leaveOnEscape(e: KeyboardEvent<HTMLTextAreaElement>): void {
  if (e.key !== 'Escape') return;
  e.stopPropagation();
  e.currentTarget.blur();
}

/** Enter sends where there is a keyboard (Shift+Enter: a new line); a phone's Enter is a line. */
const sendsOnEnter = (e: KeyboardEvent): boolean =>
  e.key === 'Enter' &&
  !e.shiftKey &&
  !e.nativeEvent.isComposing &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: fine)').matches;

/** The box's keys: Esc leaves it, Enter sends where there is a keyboard. */
function onBoxKey(e: KeyboardEvent<HTMLTextAreaElement>, send: () => void): void {
  leaveOnEscape(e);
  if (!sendsOnEnter(e)) return;
  e.preventDefault();
  send();
}

/**
 * The composer's pill (FamChatWebThread): the emoji face, the box (one line that grows with the
 * text) and the paperclip; the emoji grid and the attach card pop in above it and close on a
 * click outside or Esc.
 */
export function ComposerPill({ s }: { s: ReturnType<typeof useComposer> }) {
  const pill = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const close = () => s.setPanel('none');
  useDismiss(pill, { open: s.panel !== 'none', onDismiss: close });
  const toggle = (panel: Panel) => () => s.setPanel(s.panel === panel ? 'none' : panel);
  return (
    <div ref={pill} className={PILL}>
      {s.panel === 'emoji' && (
        <EmojiPanel onPick={(emoji) => s.addEmoji(emoji, box.current)} onClose={close} />
      )}
      {s.panel === 'attach' && (
        <AttachMenu onFile={(file) => s.sendFile(pickedFile(file))} onClose={close} />
      )}
      <IconButton
        label={c.emoji}
        aria-expanded={s.panel === 'emoji'}
        onClick={toggle('emoji')}
        className="ab-press rounded-full"
      >
        <ChatGlyph name="smile" />
      </IconButton>
      <textarea
        ref={box}
        aria-label={c.messageLabel}
        dir="auto"
        rows={1}
        value={s.text}
        placeholder={c.placeholder}
        onKeyDown={(e) => onBoxKey(e, s.sendText)}
        onChange={(e) => s.setText(e.target.value)}
        className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-1 py-2.5 text-body outline-none [field-sizing:content]"
      />
      <IconButton
        label={c.media.attach}
        aria-expanded={s.panel === 'attach'}
        disabled={s.files.uploading}
        onClick={toggle('attach')}
        className="ab-press rounded-full"
      >
        <Icon name="paperclip" />
      </IconButton>
    </div>
  );
}
