import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { MediaPlayer } from './MediaPlayer';

const file = (patch: { url?: string; mime: string }) => ({ url: 'https://storage.test/a?token=1', expires_at: '2026-10-19T12:00:00Z', ...patch });
const KIND = t.inbox.media.video;

describe('MediaPlayer (D1)', () => {
  it('a video plays inline with native controls', () => {
    const { container } = render(<MediaPlayer file={file({ mime: 'video/mp4' })} kind={KIND} />);
    const video = container.querySelector('video');
    expect(video?.getAttribute('src')).toBe('https://storage.test/a?token=1');
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.getAttribute('aria-label')).toBe(KIND);
    expect(container.querySelector('audio')).toBeNull();
  });

  it('a voice note is an <audio>', () => {
    const { container } = render(<MediaPlayer file={file({ mime: 'audio/ogg' })} kind={t.inbox.media.audio} />);
    expect(container.querySelector('audio')?.getAttribute('src')).toBe('https://storage.test/a?token=1');
    expect(container.querySelector('video')).toBeNull();
  });

  it('a file the browser cannot play falls back to the «افتح» link', () => {
    const { container } = render(<MediaPlayer file={file({ mime: 'video/3gpp' })} kind={KIND} />);
    const video = container.querySelector('video');
    if (!video) throw new Error('no video');
    fireEvent.error(video);
    const link = screen.getByRole('link', { name: t.inbox.openMedia.replace('{kind}', KIND) });
    expect(link.getAttribute('href')).toBe('https://storage.test/a?token=1');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(container.querySelector('video')).toBeNull();
  });

  it('a refetched signed URL does not change the src (playback never restarts)', () => {
    const { container, rerender } = render(<MediaPlayer file={file({ mime: 'audio/mpeg' })} kind={KIND} />);
    rerender(<MediaPlayer file={file({ mime: 'audio/mpeg', url: 'https://storage.test/a?token=2' })} kind={KIND} />);
    expect(container.querySelector('audio')?.getAttribute('src')).toBe('https://storage.test/a?token=1');
  });
});
