import type { RefObject } from 'react';
import { TextInput, type TextInputSelectionChangeEvent } from 'react-native';
import { AttachIcon, EmojiIcon, KeyboardIcon } from '../../../chat-ui/icons/composer-icons';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { IconButton } from '../../../ui/primitives/IconButton';
import { RecordingPill } from '../RecordingPill';

interface ComposerPillProps {
  input: RefObject<TextInput | null>;
  text: string;
  onText: (text: string) => void;
  onSelection: (selection: { start: number; end: number }) => void;
  /** The emoji panel is open: its button goes back to the keyboard. */
  emoji: boolean;
  onEmoji: () => void;
  /** The box takes the focus: the emoji panel gives way to the keyboard. */
  onFocus: () => void;
  /** A voice note is being recorded, and its clock: the recording bar instead. */
  recording: boolean;
  recordedMs: number;
  onCancelRecording: () => void;
  /** Absent where the app picks no files. */
  onAttach?: () => void;
}

export function ComposerPill({ input, ...p }: ComposerPillProps) {
  const { color } = useTheme();
  const c = t.studentChannel;
  if (p.recording) return <RecordingPill ms={p.recordedMs} onCancel={p.onCancelRecording} />;
  const onSelect = (e: TextInputSelectionChangeEvent) => p.onSelection(e.nativeEvent.selection);
  return (
    <>
      <IconButton label={p.emoji ? c.keyboard : c.emoji} onPress={p.onEmoji}>
        {p.emoji ? <KeyboardIcon color={color.ink3} /> : <EmojiIcon color={color.ink3} />}
      </IconButton>
      <TextInput
        ref={input}
        accessibilityLabel={c.messageLabel}
        multiline
        value={p.text}
        onChangeText={p.onText}
        onSelectionChange={onSelect}
        onFocus={p.onFocus}
        placeholder={c.placeholder}
        placeholderTextColor={color.ink3}
        style={{
          flex: 1,
          minHeight: 46,
          maxHeight: 140,
          paddingVertical: 11,
          paddingStart: 12,
          paddingEnd: 4,
          fontFamily: type.ui[400],
          fontSize: type.size.base,
          lineHeight: 24,
          color: color.ink,
        }}
      />
      {p.onAttach ? (
        <IconButton label={c.media.attach} onPress={p.onAttach}>
          <AttachIcon color={color.lapis} />
        </IconButton>
      ) : null}
    </>
  );
}
