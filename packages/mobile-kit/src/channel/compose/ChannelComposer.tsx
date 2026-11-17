import type { ChannelMessageView } from '@ab/shared';
import { useState } from 'react';
import { ComposerBar } from '../../chat-ui/composer/ComposerBar';
import type { ChannelRef } from '../channel-api';
import { AttachSheet } from './AttachSheet';
import { ComposerAbove } from './ComposerAbove';
import { ComposerAction } from './ComposerAction';
import { ComposerPill } from './ComposerPill';
import { useAttach } from './use-attach';
import { useComposer } from './use-composer';
import { useRecording } from './use-recording';

interface ChannelComposerProps {
  refs: ChannelRef;
  /** The message being answered (swipe or «ردّ»), or null. */
  replyTo: ChannelMessageView | null;
  onReplyDone: () => void;
}

/**
 * The typing bar (ChatX boards, the kit's ComposerBar): the pill, then the round button: «أرسل»
 * once there is text (or to send a recording), else the microphone where the app records. The
 * quote being answered sits over it. Attach and the microphone only where the app gives the port.
 */
export function ChannelComposer({ refs, replyTo, onReplyDone }: ChannelComposerProps) {
  const [sheet, setSheet] = useState(false);
  const reply = { id: replyTo?.id ?? null, done: onReplyDone };
  const box = useComposer(refs, reply);
  const files = useAttach(refs, reply);
  const voice = useRecording(files.sendFile);
  const action = (
    <ComposerAction
      mic={!box.hasText && voice.available && !voice.on}
      recording={voice.on}
      canSend={box.canSend}
      onRecord={voice.start}
      onStop={voice.stop}
      onSend={box.submit}
    />
  );
  const above = (
    <ComposerAbove
      problem={box.note ?? files.error}
      uploading={files.uploading}
      recording={voice.on}
      replyTo={replyTo}
      onCancelReply={onReplyDone}
    />
  );
  const pill = (
    <ComposerPill
      text={box.text}
      onText={box.setText}
      recording={voice.on}
      onCancelRecording={voice.cancel}
      onAttach={files.photo || files.pdf ? () => setSheet(true) : undefined}
    />
  );
  return (
    <>
      <ComposerBar above={above} pill={pill} action={action} />
      <AttachSheet
        open={sheet}
        photo={files.photo}
        pdf={files.pdf}
        onClose={() => setSheet(false)}
      />
    </>
  );
}
