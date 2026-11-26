import { useState } from 'react';
import { ComposerBar, RoundAction } from '@ab/mobile-kit';
import { PillContents, type PillProps } from '@/inbox/composer/pill/ComposerPill';
import { MicHold } from '@/inbox/composer/voice/MicHold';
import { RecordingBar } from '@/inbox/composer/voice/RecordingBar';
import type { VoiceUi } from '@/inbox/composer/voice/use-voice';
import { IDLE, roundMode } from '@/inbox/composer/voice/voice-machine';
import { VoiceNoteLine } from '@/inbox/composer/voice/VoiceNoteLine';
import { VoiceSlot } from '@/inbox/composer/voice/VoiceSlot';
import { voiceSupported } from '@/inbox/composer/voice/voice-support';

interface OpenRowProps extends PillProps {
  /** A staged file means the round button sends, never records. */
  staged: boolean;
  onSend: () => void;
  /** One send at a time. */
  sending: boolean;
  blocked?: boolean;
}

interface Voice {
  ui: VoiceUi | null;
  inCall: boolean;
}

/** The pill, then the round button, in reading order: mirrored with the phone's direction. */
function Row({ p, voice }: { p: OpenRowProps; voice: Voice }) {
  const { ui } = voice;
  const state = ui?.state ?? IDLE;
  const mode = roundMode({
    voice: ui !== null && !voice.inCall,
    text: p.text,
    staged: p.staged,
    state,
  });
  const bar = ui !== null && state.kind !== 'idle' && state.kind !== 'arming';
  const empty = (p.text.trim() === '' || p.blocked === true) && !p.staged;
  const round =
    mode === 'mic' && ui ? (
      <MicHold voice={ui}>
        <RoundAction mode="mic" />
      </MicHold>
    ) : bar && ui ? (
      <RoundAction mode="send" disabled={p.sending || state.kind === 'sending'} onSend={() => void ui.finish()} />
    ) : (
      <RoundAction mode="send" disabled={p.sending || empty} onSend={p.onSend} />
    );
  return (
    <ComposerBar
      above={ui ? <VoiceNoteLine note={ui.note} /> : null}
      pill={bar && ui ? <RecordingBar voice={ui} /> : <PillContents {...p} />}
      action={round}
    />
  );
}

/** Row order follows reading order so it mirrors; voice notes only for staff where APK records. */
export function OpenRow(p: OpenRowProps) {
  const [records] = useState(voiceSupported);
  if (!p.staff || !records) return <Row p={p} voice={{ ui: null, inCall: false }} />;
  return (
    <VoiceSlot key={p.phone} phone={p.phone} onError={p.onFileError} busy={p.sending}>
      {(ui, inCall) => <Row p={p} voice={{ ui, inCall }} />}
    </VoiceSlot>
  );
}
