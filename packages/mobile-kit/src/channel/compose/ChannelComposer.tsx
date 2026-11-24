import type { ChannelMessageView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ComposerBar } from '../../chat-ui/composer/ComposerBar';
import { EmojiGrid } from '../../chat-ui/emoji/EmojiGrid';
import { shape } from '../../theme';
import type { ChannelRef } from '../channel-api';
import { AttachSheet } from './AttachSheet';
import { ComposerAbove } from './ComposerAbove';
import { ComposerAction } from './ComposerAction';
import { ComposerPill } from './ComposerPill';
import { useAttach } from './use-attach';
import { useComposer } from './use-composer';
import { useEmojiPanel } from './use-emoji-panel';
import { useRecording } from './use-recording';

interface ChannelComposerProps {
  refs: ChannelRef;
  replyTo: ChannelMessageView | null;
  onReplyDone: () => void;
}

/** Attach and the microphone show only where the app gives the port. */
export function ChannelComposer({ refs, replyTo, onReplyDone }: ChannelComposerProps) {
  const [sheet, setSheet] = useState(false);
  const reply = { id: replyTo?.id ?? null, done: onReplyDone };
  const box = useComposer(refs, reply);
  const files = useAttach(refs, reply);
  const voice = useRecording(files.sendFile);
  const emoji = useEmojiPanel();
  const pill = (
    <ComposerPill
      input={emoji.input}
      text={box.text}
      onText={box.setText}
      onSelection={box.setSelection}
      emoji={emoji.open}
      onEmoji={emoji.toggle}
      onFocus={emoji.close}
      recording={voice.on}
      recordedMs={voice.ms}
      onCancelRecording={voice.cancel}
      onAttach={files.any ? () => setSheet(true) : undefined}
    />
  );
  return (
    <>
      <ComposerBar
        size={shape.control.comfort}
        above={
          <ComposerAbove
            problem={box.note ?? files.error}
            uploading={files.uploading}
            recording={voice.on}
            replyTo={replyTo}
            onCancelReply={onReplyDone}
          />
        }
        pill={pill}
        action={<ComposerAction box={box} voice={voice} />}
      />
      {emoji.open ? (
        <View testID="channel-emoji" style={{ height: 240, paddingTop: 8 }}>
          <EmojiGrid onPick={box.insert} />
        </View>
      ) : null}
      <AttachSheet open={sheet} sources={files.sources} onClose={() => setSheet(false)} />
    </>
  );
}
