import type { SubmitEvent } from 'react';
import { ComposerHint, ComposerNotes, RoundAction } from './ComposerParts';
import { ComposerPill } from './ComposerPill';
import { RecordingBar } from './RecordingBar';
import { ReplyBar } from './ReplyBar';
import { useComposer, type ComposerInput } from './use-composer';

/** Text up to CHANNEL_BODY_MAX characters; the API trims and checks again. */
export function ChannelComposer(props: ComposerInput) {
  const s = useComposer(props);
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    s.sendText();
  };
  const empty = s.round === 'send' && s.text.trim() === '';
  const recording = s.mic.state === 'recording';
  return (
    <form onSubmit={submit} className="grid gap-2 border-t border-rule pt-3">
      {props.reply.to && <ReplyBar to={props.reply.to} onCancel={props.reply.cancel} />}
      <ComposerNotes
        problem={props.send.problem ?? s.files.problem}
        tooLong={s.tooLong}
        denied={s.mic.state === 'denied'}
        uploading={s.files.uploading}
      />
      <div className="flex items-end gap-2">
        {recording ? (
          <RecordingBar seconds={s.mic.seconds} onCancel={s.mic.cancel} />
        ) : (
          <ComposerPill s={s} />
        )}
        <RoundAction
          key={s.round}
          round={s.round}
          disabled={empty || s.tooLong || props.send.pending}
          onMic={() => void s.mic.start()}
          onVoice={s.finishVoice}
        />
      </div>
      <ComposerHint />
    </form>
  );
}
