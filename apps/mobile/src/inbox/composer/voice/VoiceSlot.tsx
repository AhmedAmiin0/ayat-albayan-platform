import type { ReactNode } from 'react';
import { useCalls } from '../../thread/calls/state/call-context';
import { useVoice, type VoiceUi } from './use-voice';
import { useVoiceGuards } from './use-voice-guards';

interface VoiceSlotProps {
  phone: string;
  onError: (message: string | null) => void;
  /** Another send of this chat is on its way. */
  busy: boolean;
  children: (voice: VoiceUi, inCall: boolean) => ReactNode;
}

/**
 * Owns one chat's recorder (mounted only where voiceSupported(): the native recorder exists only
 * there). Keyed by the phone where it is used, so a recording never moves to another chat: leaving
 * the chat closes the microphone and drops it. In a call the microphone is the call's: no new
 * recording, and one in progress is kept.
 */
export function VoiceSlot({ phone, onError, busy, children }: VoiceSlotProps) {
  const inCall = useCalls()?.busy === true;
  const voice = useVoice({ phone, onError, busy });
  useVoiceGuards(voice, inCall);
  return <>{children(voice, inCall)}</>;
}
