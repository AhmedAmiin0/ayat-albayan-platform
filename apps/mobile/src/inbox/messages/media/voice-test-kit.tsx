import type { MessageView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { message, PHONE } from '../../shared/thread-fixtures';
import { VoiceNote } from './VoiceNote';

// Shared by the VoiceNote tests: one mocked player per signed URL, the status set per test.
export const KIND = t.inbox.media.audio;
export const PLAY = t.inbox.playMedia.replace('{kind}', KIND);
export const pathOf = (id: string) => `/threads/%2B966552147730/messages/${id}/file`;
export const signed = (id: string) => `https://storage.test/wa-media/${id}.ogg?token=x`;

type Status = ReturnType<typeof useAudioPlayerStatus>;
const fakePlayer = () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => undefined), setPlaybackRate: jest.fn() });
type FakePlayer = ReturnType<typeof fakePlayer>;
export const players = new Map<string, FakePlayer>();

/** Every player reports `fields` (a loaded 65 s note by default). */
export function statusIs(fields: Partial<Status>) {
  jest.mocked(useAudioPlayerStatus).mockReturnValue({
    playing: false, currentTime: 0, duration: 65, didJustFinish: false, isLoaded: true, isBuffering: false, ...fields,
  } as Status);
}

export function resetPlayers() {
  players.clear();
  jest.mocked(useAudioPlayer).mockImplementation((source) => {
    const key = String(source);
    const p = players.get(key) ?? fakePlayer();
    players.set(key, p);
    return p as unknown as ReturnType<typeof useAudioPlayer>;
  });
}

const voiceRow = (id = 'v1', over: Partial<MessageView> = {}) =>
  message({ id, direction: 'inbound', status: 'delivered', body: null, media_mime: 'audio/ogg; codecs=opus', ...over });

export const voiceNote = (m: MessageView = voiceRow()) => <VoiceNote message={m} phone={PHONE} kind={KIND} />;
export const showVoice = (m: MessageView = voiceRow()) => renderWithQuery(voiceNote(m));

export const tapPlay = () => fireEvent.press(screen.getByRole('button', { name: PLAY }));
