import type { ActiveCallView, CallConfigView } from '@ab/shared';
import { createElement } from 'react';
import { vi } from 'vitest';
import type { RtcDeps } from '../rtc/media';
import { useCalls } from './call-context';

/** The family's name in these tests. */
export const NAME = 'أم سهيلة';

// Test-only helpers for the calls provider tests (fakes only: no WebRTC, no network).

export const CONFIG: CallConfigView = { enabled: true, available: true, canCall: true, iceServers: [{ urls: ['stun:stun.example.org'] }] };

export function activeRow(patch: Partial<ActiveCallView> = {}): ActiveCallView {
  return {
    id: 'c1', phone_e164: '+966501234567', direction: 'inbound', status: 'ringing', end_reason: null, display_name: NAME,
    staff_id: null, started_at: '2026-10-26T10:00:00Z', answered_at: null, ended_at: null, duration_seconds: null,
    offer_sdp: 'v=0 their', answer_sdp: null, ...patch,
  };
}

/** A fake browser: the peer answers with fixed SDPs, the mic always opens. */
export function fakeRtc(): RtcDeps {
  const track = { enabled: true, stop: vi.fn() };
  const stream = { getAudioTracks: () => [track], getTracks: () => [track] };
  const pc = Object.assign(new EventTarget(), {
    iceGatheringState: 'complete',
    localDescription: null as { sdp: string } | null,
    remoteDescription: null as { sdp: string } | null,
    addTrack: vi.fn(),
    close: vi.fn(),
    createOffer: async () => ({ type: 'offer', sdp: 'v=0 ours' }),
    createAnswer: async () => ({ type: 'answer', sdp: 'v=0 answer' }),
    setLocalDescription: async (d: { sdp: string }) => void (pc.localDescription = d),
    setRemoteDescription: async (d: { sdp: string }) => void (pc.remoteDescription = d),
  });
  return { createPeer: () => pc as unknown as RTCPeerConnection, getMic: async () => stream as unknown as MediaStream };
}

/** A button that calls one chat, as the thread header does. */
export function CallProbe() {
  const ui = useCalls();
  if (!ui) return createElement('p', null, 'calls-off');
  return createElement('button', { type: 'button', onClick: () => ui.call({ phone: '+966501234567', name: NAME }) }, 'probe');
}
