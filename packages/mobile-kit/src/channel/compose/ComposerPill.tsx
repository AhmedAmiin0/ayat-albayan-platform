import { useRef } from 'react';
import { TextInput } from 'react-native';
import { CloseIcon } from '../../chat-ui/icons/chat-glyphs';
import { t } from '../../lib/i18n/i18n';
import { type, useTheme } from '../../theme';
import { IconButton } from '../../ui/primitives/IconButton';
import { ClipIcon, EmojiIcon } from './compose-icons';

interface ComposerPillProps {
  text: string;
  onText: (text: string) => void;
  /** A voice note is being recorded: only its ✕ shows. */
  recording: boolean;
  onCancelRecording: () => void;
  /** «إرفاق ملف»; absent where the app picks no files. */
  onAttach?: () => void;
}

/**
 * The pill's contents in reading order (ChatX boards): the emoji button (it opens the phone's
 * keyboard, emoji included), the text box (16pt), the clip. While recording: its ✕.
 */
export function ComposerPill(p: ComposerPillProps) {
  const { color } = useTheme();
  const input = useRef<TextInput>(null);
  const c = t.studentChannel;
  if (p.recording) {
    return (
      <IconButton label={c.media.cancel} onPress={p.onCancelRecording}>
        <CloseIcon color={color.bad} />
      </IconButton>
    );
  }
  return (
    <>
      <IconButton compact label={c.emoji} onPress={() => input.current?.focus()}>
        <EmojiIcon color={color.ink3} />
      </IconButton>
      <TextInput
        ref={input}
        accessibilityLabel={c.messageLabel}
        multiline
        value={p.text}
        onChangeText={p.onText}
        placeholder={c.placeholder}
        placeholderTextColor={color.ink3}
        style={{
          flex: 1,
          minHeight: 46,
          maxHeight: 140,
          paddingVertical: 11,
          paddingHorizontal: 4,
          fontFamily: type.ui[400],
          fontSize: type.size.base,
          color: color.ink,
        }}
      />
      {p.onAttach ? (
        <IconButton compact label={c.media.attach} onPress={p.onAttach}>
          <ClipIcon color={color.lapis} />
        </IconButton>
      ) : null}
    </>
  );
}
