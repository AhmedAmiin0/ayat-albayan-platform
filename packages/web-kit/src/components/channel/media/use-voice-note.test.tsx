import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nowPlaying } from '#/lesson-files/use-now-playing.ts';
import { useVoiceNote } from './use-voice-note';

/** One note's <audio> with the hook's handlers (jsdom does not play: the events are fired). */
function Note({ label }: { label: string }) {
  const note = useVoiceNote(4000);
  return (
    <audio aria-label={label} {...note.media}>
      <track kind="captions" />
    </audio>
  );
}

const audio = (label: string) => document.querySelector<HTMLAudioElement>(`[aria-label="${label}"]`);
const fire = (el: HTMLAudioElement | null, type: string) =>
  act(() => void el?.dispatchEvent(new Event(type)));

afterEach(() => vi.restoreAllMocks());

describe('useVoiceNote and the one sounding player', () => {
  it('a note that plays takes the stage; another player that starts pauses it', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    render(<Note label="note" />);
    fire(audio('note'), 'play');
    expect(nowPlaying.current()).not.toBeNull();
    act(() => nowPlaying.claim({ id: 'recording-1', stop: () => undefined }));
    expect(pause).toHaveBeenCalled();
    act(() => nowPlaying.release('recording-1'));
  });

  it('a note that starts stops the recording before it; its pause frees the stage', () => {
    const stop = vi.fn();
    render(<Note label="note" />);
    act(() => nowPlaying.claim({ id: 'recording-1', stop }));
    fire(audio('note'), 'play');
    expect(stop).toHaveBeenCalled();
    fire(audio('note'), 'pause');
    expect(nowPlaying.current()).toBeNull();
  });

  it('leaving the chat while it plays frees the stage', () => {
    const view = render(<Note label="note" />);
    fire(audio('note'), 'play');
    view.unmount();
    expect(nowPlaying.current()).toBeNull();
  });
});
