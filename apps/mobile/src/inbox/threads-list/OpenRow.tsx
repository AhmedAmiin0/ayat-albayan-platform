import { useState } from 'react';
import { View } from 'react-native';
import { shape, useTheme } from '@/theme';
import { PillContents, type PillProps } from '../composer/pill/ComposerPill';
import { RoundAction } from '../composer/pill/RoundAction';
import { MicHold } from '../composer/voice/MicHold';
import { RecordingBar } from '../composer/voice/RecordingBar';
import type { VoiceUi } from '../composer/voice/use-voice';
import { IDLE, roundMode } from '../composer/voice/voice-machine';
import { VoiceNoteLine } from '../composer/voice/VoiceNoteLine';
import { VoiceSlot } from '../composer/voice/VoiceSlot';
import { voiceSupported } from '../composer/voice/voice-support';

interface OpenRowProps extends PillProps {
  /** A saved reply's file waits in its chip: «أرسل», never the microphone. */
  staged: boolean;
  onSend: () => void;
  /** The text or a staged file is on its way: one «أرسل» at a time. */
  sending: boolean;
}

interface Voice {
  ui: VoiceUi | null;
  inCall: boolean;
}

/** The pill, then the round button, in reading order: mirrored with the phone's direction. */
function Row({ p, voice }: { p: OpenRowProps; voice: Voice }) {
  const { color } = useTheme();
  const { ui } = voice;
  const state = ui?.state ?? IDLE;
  const mode = roundMode({ voice: ui !== null && !voice.inCall, text: p.text, staged: p.staged, state });
  const bar = ui !== null && state.kind !== 'idle' && state.kind !== 'arming';
  const empty = p.text.trim() === '' && !p.staged;
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
    <View style={{ gap: 4 }}>
      {ui ? <VoiceNoteLine note={ui.note} /> : null}
      <View testID="open-row" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <View
          testID="composer-pill"
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'flex-end',
            minHeight: shape.control.touch,
            borderRadius: shape.radius.pill,
            borderWidth: 1,
            borderColor: color.ruleInput,
            backgroundColor: color.raised,
            paddingHorizontal: 2,
          }}
        >
          {bar && ui ? <RecordingBar voice={ui} /> : <PillContents {...p} />}
        </View>
        <View testID="round-action">{round}</View>
      </View>
    </View>
  );
}

/**
 * The open window's row as WhatsApp (owner 2026-10-27): [pill: emoji · text · paperclip · camera]
 * then the round microphone / «أرسل», in reading order, so it mirrors with the phone (the round
 * button on the right in English, on the left in Arabic). Voice notes: staff only, where the APK
 * records; a teacher's row has no microphone, paperclip or camera.
 */
export function OpenRow(p: OpenRowProps) {
  const [records] = useState(voiceSupported);
  if (!p.staff || !records) return <Row p={p} voice={{ ui: null, inCall: false }} />;
  return (
    <VoiceSlot key={p.phone} phone={p.phone} onError={p.onFileError} busy={p.sending}>
      {(ui, inCall) => <Row p={p} voice={{ ui, inCall }} />}
    </VoiceSlot>
  );
}
