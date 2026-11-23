import { formatClock } from '@ab/client-core';
import type { ChannelAttachmentView } from '@ab/shared';
import { ChatGlyph } from '#/components/channel/bubble/ChatGlyph.tsx';
import { Ltr } from '#/components/ui/display/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { useVoiceNote } from './use-voice-note';
import { Waveform } from './Waveform';

interface Props {
  id: string;
  file: ChannelAttachmentView & { url: string };
}

const m = t.studentChannel.media;

/**
 * A voice note played in the page (FamChatWebThread): the round play / pause, the waveform as
 * its seek bar, and the clock (where it is while it plays, else its length).
 */
export function VoiceBubble({ id, file }: Props) {
  const note = useVoiceNote(file.duration_ms);
  const playing = note.state.status === 'playing';
  const moved = playing || note.state.position > 0;
  const clock = formatClock(moved ? note.state.position : note.duration);
  return (
    <div className="flex w-60 max-w-full items-center gap-2.5">
      <audio src={file.url} preload="metadata" {...note.media}>
        <track kind="captions" />
      </audio>
      <button
        type="button"
        aria-label={playing ? m.pause : m.play}
        onClick={note.toggle}
        className="ab-press grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary-hover"
      >
        <ChatGlyph name={playing ? 'pause' : 'play'} className="size-5" />
      </button>
      <Waveform
        seed={id}
        position={note.state.position}
        duration={note.duration}
        seek={note.seek}
      />
      <Ltr className="text-2xs font-semibold text-ink-2 tabular-nums">{clock}</Ltr>
    </div>
  );
}
