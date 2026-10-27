// Test-only fakes for the calls provider (docs/28 PR 2): a fake WebRTC (no native module), the API
// routes answered from a table, and the rows /calls/active lists. No network, no hosted call.
import type { ActiveCallView, CallConfigView } from '@ab/shared';
import type { MicAnswer, NativePeer, RtcDeps } from '../rtc/media';

export const ON: CallConfigView = { enabled: true, available: true, canCall: true, iceServers: [{ urls: ['stun:stun.example.org'] }] };
export const OFF: CallConfigView = { enabled: false, available: true, canCall: true, iceServers: [] };

export function ringing(over: Partial<ActiveCallView> = {}): ActiveCallView {
  return {
    ...{ id: 'in1', phone_e164: '+966501234567', direction: 'inbound', status: 'ringing', end_reason: null, display_name: 'أم سهيلة' },
    ...{ staff_id: null, started_at: '2026-10-26T10:00:00Z', answered_at: null, ended_at: null, duration_seconds: null },
    ...{ offer_sdp: 'v=0 their offer', answer_sdp: null },
    ...over,
  };
}

interface FakePeer extends NativePeer {
  setRemoteDescription: jest.Mock;
  close: jest.Mock;
}

function fakePeer(): FakePeer {
  const pc = {
    iceGatheringState: 'complete',
    connectionState: 'new',
    localDescription: null as { sdp: string } | null,
    remoteDescription: null as unknown,
    createOffer: async () => ({ type: 'offer' as const, sdp: 'v=0 our offer' }),
    createAnswer: async () => ({ type: 'answer' as const, sdp: 'v=0 our answer' }),
    setLocalDescription: async (d: { sdp: string }) => void (pc.localDescription = d),
    setRemoteDescription: jest.fn(async (d: unknown) => void (pc.remoteDescription = d)),
    addTrack: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    close: jest.fn(),
  };
  return pc;
}

/** A fake device: the mic track (and its release), every peer made, and the answer to the mic prompt. */
export function fakeRtc(askMic: () => Promise<MicAnswer> = async () => 'granted') {
  const track = { enabled: true, stop: jest.fn() };
  const release = jest.fn();
  const mic = { getAudioTracks: () => [track], getTracks: () => [track], release };
  const peers: FakePeer[] = [];
  const deps: RtcDeps = {
    createPeer: () => {
      const pc = fakePeer();
      peers.push(pc);
      return pc;
    },
    askMic,
    getMic: async () => mic,
  };
  return { deps, track, release, peers };
}

/** A promise the test settles by hand (a request in flight, the open mic prompt). */
export function deferred<T>() {
  let resolve: (v: T) => void = () => undefined;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** apiFetch answers: config, the active rows (a value, or a function per call), the permission state and the lists. */
export function routes(input: { config: CallConfigView; active?: ActiveCallView[] | (() => Promise<ActiveCallView[]>); permission?: string }) {
  return async (path: string): Promise<unknown> => {
    if (path === '/calls/config') return input.config;
    if (path === '/calls/active') return typeof input.active === 'function' ? input.active() : (input.active ?? []);
    if (path.startsWith('/calls/permission/')) return { state: input.permission ?? 'granted', expires_at: null };
    if (path.startsWith('/calls')) return [];
    throw new Error(`unexpected GET ${path}`);
  };
}
