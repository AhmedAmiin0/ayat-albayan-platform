import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { AudioPlayer } from './AudioPlayer';

const P = t.audioPlayer;

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

function loaded() {
  render(<AudioPlayer id="rec-x" url="https://files.example/r.mp3" label="rec" />);
  const audio = screen.getByLabelText<HTMLAudioElement>('rec', { selector: 'audio' });
  Object.defineProperty(audio, 'duration', { value: 120, configurable: true });
  fireEvent.loadedMetadata(audio);
  return audio;
}

describe('AudioPlayer (web)', () => {
  it('plays and pauses the <audio>', () => {
    loaded();
    fireEvent.click(screen.getByRole('button', { name: P.play }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: P.pause }));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('skips 10 s and changes the speed of the element', () => {
    const audio = loaded();
    fireEvent.click(screen.getByRole('button', { name: P.forward }));
    expect(audio.currentTime).toBe(10);
    fireEvent.click(screen.getByRole('radio', { name: '1.5×' }));
    expect(audio.playbackRate).toBe(1.5);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '1.5×' }).checked).toBe(true);
  });

  it('seeks with the slider keys (RTL: the left arrow moves forward) and keeps times LTR', () => {
    const audio = loaded();
    const slider = screen.getByRole('slider', { name: P.seek });
    document.documentElement.dir = 'rtl';
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(audio.currentTime).toBe(10);
    fireEvent.keyDown(slider, { key: 'End' });
    expect(audio.currentTime).toBe(120);
    expect(slider.getAttribute('aria-valuenow')).toBe('120');
    expect(screen.getByText('2:00', { selector: 'bdi' }).getAttribute('dir')).toBe('ltr');
    document.documentElement.dir = '';
  });

  it('shows the failure', () => {
    render(<AudioPlayer id="rec-y" url="https://files.example/r.mp3" label="rec" />);
    fireEvent.error(screen.getByLabelText('rec', { selector: 'audio' }));
    expect(screen.getByText(P.failed)).toBeTruthy();
  });
});
