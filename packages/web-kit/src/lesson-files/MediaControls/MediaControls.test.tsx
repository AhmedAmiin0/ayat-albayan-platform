import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { MediaControls } from './MediaControls';

const P = t.audioPlayer;
type Status = 'loading' | 'paused' | 'playing' | 'ended' | 'failed';

const player = (status: Status, position = 0) => ({
  state: { status, position, duration: 120, speed: 1 as const },
  controls: {
    toggle: vi.fn(),
    skip: vi.fn(),
    setSpeed: vi.fn(),
    seek: vi.fn(),
    startOver: vi.fn(),
  },
});

describe('MediaControls', () => {
  it('a saved stop shows where it resumes and starts over on request', () => {
    const p = player('paused', 25);
    render(<MediaControls player={p} from={40} />);
    expect(screen.getByText('0:40', { selector: 'bdi' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: P.startOver }));
    expect(p.controls.startOver).toHaveBeenCalledOnce();
  });

  it('no resume hint for a new player or before the stop is known', () => {
    const { unmount } = render(<MediaControls player={player('paused', 40)} from={0} />);
    expect(screen.queryByRole('button', { name: P.startOver })).toBeNull();
    unmount();
    render(<MediaControls player={player('loading', 0)} from={40} />);
    expect(screen.queryByRole('button', { name: P.startOver })).toBeNull();
  });

  it('the seek bar and the buttons follow the state', () => {
    render(<MediaControls player={player('playing', 10)} from={0} />);
    expect(screen.getByRole('slider', { name: P.seek }).getAttribute('aria-valuenow')).toBe('10');
    expect(screen.getByRole('button', { name: P.pause })).toBeTruthy();
    expect(screen.queryByText(P.failed)).toBeNull();
  });

  it('a failed play shows the failure', () => {
    render(<MediaControls player={player('failed')} from={0} />);
    expect(screen.getByText(P.failed)).toBeTruthy();
  });
});
