// Test-only fakes for the room screen (docs/35): a fake LiveKit client whose snapshot the test
// drives, and a fake platform (no native module in Node). No network, no media.
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  EMPTY_SNAPSHOT,
  type CamMicAnswer,
  type RoomClient,
  type RoomPlatform,
  type RoomSnapshot,
  type RoomTile,
} from '@/classroom/room/model/room-types';

export interface FakeClient extends RoomClient {
  /** Replace the snapshot and tell the screen, as LiveKit's events do. */
  push: (next: Partial<RoomSnapshot>) => void;
  connect: jest.Mock;
  disconnect: jest.Mock;
  setMic: jest.Mock;
  setCamera: jest.Mock;
  switchCamera: jest.Mock;
}

function fakeClient(): FakeClient {
  let snap = EMPTY_SNAPSHOT;
  const listeners = new Set<() => void>();
  return {
    push(next) {
      snap = { ...snap, ...next };
      listeners.forEach((l) => l());
    },
    connect: jest.fn(() => Promise.resolve()),
    disconnect: jest.fn(),
    snapshot: () => snap,
    subscribe(l) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    setMic: jest.fn(() => Promise.resolve()),
    setCamera: jest.fn(() => Promise.resolve()),
    switchCamera: jest.fn(() => Promise.resolve(false)),
  };
}

const GRANTED: CamMicAnswer = { mic: 'granted', cam: 'granted' };

export interface FakePlatform extends RoomPlatform {
  client: FakeClient;
  stopPreview: jest.Mock;
  audio: { start: jest.Mock; stop: jest.Mock; route: jest.Mock };
  media: { check: jest.Mock; ask: jest.Mock };
}

export function fakePlatform(
  check: CamMicAnswer = GRANTED,
  ask: CamMicAnswer = GRANTED,
): FakePlatform {
  const client = fakeClient();
  const stopPreview = jest.fn();
  return {
    client,
    stopPreview,
    createClient: () => client,
    Video: ({ mirror }) => <View testID={mirror ? 'video-mirrored' : 'video'} />,
    PreviewVideo: ({ streamUrl }) => <View testID={`preview-${streamUrl}`} />,
    openPreview: jest.fn(() => Promise.resolve({ streamUrl: 'cam-1', stop: stopPreview })),
    media: {
      check: jest.fn(() => Promise.resolve(check)),
      ask: jest.fn(() => Promise.resolve(ask)),
    },
    audio: {
      start: jest.fn(() => Promise.resolve()),
      stop: jest.fn(() => Promise.resolve()),
      route: jest.fn(() => Promise.resolve()),
    },
  };
}

export function tile(over: Partial<RoomTile> = {}): RoomTile {
  return {
    key: 'p1:camera',
    name: 'سهيلة',
    local: false,
    screen: false,
    micOn: true,
    speaking: false,
    video: null,
    ...over,
  };
}

export const LESSON = { kind: 'lesson', id: '0a5c2b1e-6c3e-4d61-9a43-1b2f9b8e7d10' } as const;
export const CREDS = { url: 'wss://lk.example.org', token: 'tok-1' };

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** The screen inside a safe area, as the app's root gives it. */
export const withInsets = (el: ReactElement) => (
  <SafeAreaProvider initialMetrics={METRICS}>{el}</SafeAreaProvider>
);
