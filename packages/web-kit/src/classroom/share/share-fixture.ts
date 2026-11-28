import { vi } from 'vitest';
import { EMPTY_SNAPSHOT, type RoomSnapshot } from '@ab/web-kit/classroom/room/components/room-types';
import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';
import { EMPTY_SHARE } from './share-messages';
import type { ShareRequests } from './use-share-requests';

// Test data only: the share hook's result and a room controller, with spies for every action.

export function fakeShare(o: Partial<ShareRequests> = {}): ShareRequests {
  return {
    canGrant: false,
    canRequest: false,
    pending: [],
    granted: [],
    drawers: [],
    mine: EMPTY_SHARE.mine,
    notice: null,
    request: vi.fn(),
    allow: vi.fn(),
    deny: vi.fn(),
    revoke: vi.fn(),
    revokeDraw: vi.fn(),
    dismiss: vi.fn(),
    ...o,
  };
}

export function fakeRoom(snap: Partial<RoomSnapshot> = {}): RoomController {
  return {
    snap: { ...EMPTY_SNAPSHOT, ...snap },
    notes: [],
    failure: null,
    toggleMic: vi.fn(),
    toggleCamera: vi.fn(),
    toggleShare: vi.fn(),
    enableAudio: vi.fn(),
    leave: vi.fn(),
    attach: vi.fn(() => () => undefined),
    sendData: vi.fn(),
    onData: vi.fn(() => () => undefined),
    onModerated: vi.fn(() => () => undefined),
    setBoardTrack: vi.fn(),
  };
}
