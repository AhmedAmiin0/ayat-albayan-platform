import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { EMPTY_SNAPSHOT, type ModeratedEvent } from '@ab/web-kit/classroom/room/components/room-types';
import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';
import type { MuteController, MuteToast } from '@ab/web-kit/classroom/mute/use-mute';
import { MuteToasts } from './MuteToasts';

const M = t.classroom.mute;

function setup(toast: MuteToast | null = null) {
  const listeners: ((e: ModeratedEvent) => void)[] = [];
  const room: RoomController = {
    snap: EMPTY_SNAPSHOT,
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
    onModerated: (l) => {
      listeners.push(l);
      return () => undefined;
    },
    setBoardTrack: vi.fn(),
  };
  const mute: MuteController = {
    canMute: () => false,
    canMuteAll: false,
    mute: vi.fn(),
    muteAll: vi.fn(),
    toast,
    dismiss: vi.fn(),
  };
  render(<MuteToasts room={room} mute={mute} />);
  const moderate = (source: ModeratedEvent['source']) =>
    act(() => listeners.forEach((l) => l({ source })));
  return { mute, moderate };
}

describe('MuteToasts', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows nothing with nothing to say', () => {
    setup();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the staff action toast and dismisses it when its time is up', () => {
    const { mute } = setup({ message: M.micDone, tone: 'info' });
    expect(screen.getByRole('status').textContent).toContain(M.micDone);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mute.dismiss).toHaveBeenCalledOnce();
  });

  it('tells me when staff muted my microphone or camera, over any staff toast', () => {
    const { moderate } = setup({ message: M.micDone, tone: 'info' });
    moderate('camera');
    expect(screen.getByRole('status').textContent).toContain(M.camByStaff);
    moderate('microphone');
    expect(screen.getByRole('status').textContent).toContain(M.byStaff);
  });

  it('closes my muted notice when its time is up', () => {
    const { moderate } = setup();
    moderate('microphone');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
