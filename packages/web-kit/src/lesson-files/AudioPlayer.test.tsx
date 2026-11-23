import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
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
    fireEvent.keyDown(slider, { key: 'Home' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(audio.currentTime).toBe(10);
    fireEvent.keyDown(slider, { key: 'End' });
    expect(audio.currentTime).toBe(120);
    expect(slider.getAttribute('aria-valuenow')).toBe('120');
    const times = screen.getAllByText('2:00', { selector: 'bdi' });
    expect(times.map((el) => el.getAttribute('dir'))).toEqual(['ltr', 'ltr']);
    document.documentElement.dir = '';
  });

  it('«تشغيل» ↔ «إيقاف مؤقت» share one button: the hidden face is aria-hidden', () => {
    loaded();
    const button = screen.getByRole('button', { name: P.play });
    const hidden = button.querySelector(':scope > span > span[aria-hidden="true"]');
    expect(hidden?.textContent).toBe(P.pause);
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: P.pause })).toBe(button);
  });

  it('one player sounds at a time: starting another pauses the first', () => {
    const pause = vi.mocked(HTMLMediaElement.prototype.pause);
    render(<AudioPlayer id="one" url="https://files.example/1.mp3" label="first" />);
    render(<AudioPlayer id="two" url="https://files.example/2.mp3" label="second" />);
    const [first, second] = screen.getAllByRole('button', { name: P.play });
    fireEvent.click(first as HTMLElement);
    expect(pause).not.toHaveBeenCalled();
    fireEvent.click(second as HTMLElement);
    expect(pause).toHaveBeenCalledOnce();
    fireEvent.pause(screen.getByLabelText('first', { selector: 'audio' }));
    expect(screen.getAllByRole('button', { name: P.play })).toHaveLength(1);
  });

  it('shows the failure', () => {
    render(<AudioPlayer id="rec-y" url="https://files.example/r.mp3" label="rec" />);
    fireEvent.error(screen.getByLabelText('rec', { selector: 'audio' }));
    expect(screen.getByText(P.failed)).toBeTruthy();
  });
});
