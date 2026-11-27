import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { VideoPlayer } from './VideoPlayer';

const P = t.audioPlayer;
const URL = 'https://files.example/v.mp4';

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

const video = () => screen.getByLabelText<HTMLVideoElement>('lesson', { selector: 'video' });

describe('VideoPlayer', () => {
  it('lays the student code over two corners', () => {
    render(<VideoPlayer id="v-1" url={URL} label="lesson" watermark="AB-0042" />);
    expect(screen.getAllByText('AB-0042')).toHaveLength(2);
    expect(video().getAttribute('src')).toBe(URL);
  });

  it('without a code there is no watermark', () => {
    render(<VideoPlayer id="v-2" url={URL} label="lesson" />);
    expect(screen.queryByText('AB-0042')).toBeNull();
  });

  it('the play mark fades out while the video plays', () => {
    const { container } = render(<VideoPlayer id="v-3" url={URL} label="lesson" />);
    const mark = () => container.querySelector('svg')?.parentElement;
    expect(mark()?.className).not.toContain('opacity-0');
    fireEvent.click(screen.getByRole('button', { name: P.play }));
    expect(mark()?.className).toContain('opacity-0');
  });

  it('asks the frame for full screen and ignores a refusal', () => {
    const full = vi.fn().mockRejectedValue(new Error('denied'));
    const own = { configurable: true, writable: true, value: full };
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', own);
    render(<VideoPlayer id="v-4" url={URL} label="lesson" />);
    fireEvent.click(screen.getByRole('button', { name: t.familyFiles.fullscreen }));
    expect(full).toHaveBeenCalledOnce();
    expect(full.mock.contexts[0]).toBe(video().parentElement);
    Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
  });

  it('a media error shows the failure', () => {
    render(<VideoPlayer id="v-5" url={URL} label="lesson" />);
    fireEvent.error(video());
    expect(screen.getByText(P.failed)).toBeTruthy();
  });
});
