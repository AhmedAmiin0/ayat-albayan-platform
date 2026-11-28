import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { tile } from '@ab/web-kit/classroom/room/livekit/fake-client';
import type { MuteController } from '@ab/web-kit/classroom/mute/use-mute';
import { MuteButtons } from './MuteButtons';

const M = t.classroom.mute;
const guest = tile({ key: 'g1', name: 'سهيلة', role: 'guest' });
const muteOf = (can: MuteController['canMute']): MuteController => ({
  canMute: can,
  canMuteAll: false,
  mute: vi.fn(),
  muteAll: vi.fn(),
  toast: null,
  dismiss: vi.fn(),
});

describe('MuteButtons', () => {
  it('offers to mute the microphone and the camera, each by name', () => {
    const mute = muteOf(() => true);
    render(<MuteButtons tile={guest} mute={mute} />);
    fireEvent.click(screen.getByRole('button', { name: M.micOf.replace('{name}', 'سهيلة') }));
    fireEvent.click(screen.getByRole('button', { name: M.camOf.replace('{name}', 'سهيلة') }));
    expect(mute.mute).toHaveBeenNthCalledWith(1, guest, 'microphone');
    expect(mute.mute).toHaveBeenNthCalledWith(2, guest, 'camera');
  });

  it('leaves out a source that may not be muted', () => {
    render(<MuteButtons tile={guest} mute={muteOf((_, s) => s === 'camera')} />);
    expect(screen.queryByRole('button', { name: M.micOf.replace('{name}', 'سهيلة') })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('renders no button when nothing may be muted', () => {
    render(<MuteButtons tile={guest} mute={muteOf(() => false)} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
