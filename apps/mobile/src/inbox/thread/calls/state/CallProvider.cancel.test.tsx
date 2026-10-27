import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { setAudioModeAsync } from 'expo-audio';
import { Vibration } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { PLAYBACK } from '../rtc/audio-route';
import type { MicAnswer } from '../rtc/media';
import { deferred, fakeRtc, ON, ringing, routes } from './call-test-kit';
import { mountCalls as mount, placed } from './call-test-mount';

const mockFetch = jest.fn();
const mockSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...a: unknown[]) => mockFetch(...a),
  apiSend: (...a: unknown[]) => mockSend(...a),
}));

const sentTo = (path: string) => mockSend.mock.calls.some((c) => c[1] === path);
const mode = jest.mocked(setAudioModeAsync);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
  jest.spyOn(Vibration, 'cancel').mockImplementation(() => undefined);
  mockFetch.mockImplementation(routes({ config: ON }));
  mockSend.mockImplementation(async () => placed);
});

describe('ending a call that is still starting', () => {
  it('during the microphone prompt: nothing is placed and the mic, once opened, is stopped and released', async () => {
    const prompt = deferred<MicAnswer>();
    const rtc = await mount(fakeRtc(() => prompt.promise));
    await fireEvent.press(await screen.findByTestId('call-button'));
    await fireEvent.press(await screen.findByLabelText(t.calls.controls.end));
    await waitFor(() => expect(screen.queryByTestId('call-screen')).toBeNull());
    await act(async () => prompt.resolve('granted'));
    await waitFor(() => expect(rtc.release).toHaveBeenCalled());
    expect(rtc.track.stop).toHaveBeenCalled();
    expect(sentTo('/calls')).toBe(false);
  });

  it('during POST /calls: the call it created is ended; the mic stopped and released', async () => {
    const post = deferred<unknown>();
    mockSend.mockImplementation((_m: string, path: string) => (path === '/calls' ? post.promise : Promise.resolve(placed)));
    const rtc = await mount();
    await fireEvent.press(await screen.findByTestId('call-button'));
    await waitFor(() => expect(sentTo('/calls')).toBe(true));
    await fireEvent.press(screen.getByLabelText(t.calls.controls.end));
    expect(rtc.track.stop).toHaveBeenCalled();
    expect(rtc.release).toHaveBeenCalled();
    await act(async () => post.resolve(placed));
    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('POST', '/calls/out1/end'));
  });

  it('during the accept: the call taken is ended on WhatsApp', async () => {
    const accept = deferred<unknown>();
    mockFetch.mockImplementation(routes({ config: ON, active: [ringing()] }));
    mockSend.mockImplementation((_m: string, path: string) => (path.endsWith('/accept') ? accept.promise : Promise.resolve(placed)));
    await mount();
    await fireEvent.press(await screen.findByLabelText(t.calls.controls.accept));
    await waitFor(() => expect(sentTo('/calls/in1/accept')).toBe(true));
    await fireEvent.press(await screen.findByLabelText(t.calls.controls.end));
    await act(async () => accept.resolve(ringing({ status: 'active' })));
    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('POST', '/calls/in1/end'));
  });
});

describe('the audio around a call', () => {
  it('mute and speaker chosen before the peer exists are applied to it', async () => {
    const prompt = deferred<MicAnswer>();
    mockFetch.mockImplementation(routes({ config: ON, active: [placed] }));
    const rtc = await mount(fakeRtc(() => prompt.promise));
    await fireEvent.press(await screen.findByTestId('call-button'));
    await fireEvent.press(await screen.findByLabelText(t.calls.controls.mute));
    await fireEvent.press(screen.getByLabelText(t.calls.controls.speaker));
    await act(async () => prompt.resolve('granted'));
    await waitFor(() => expect(rtc.peers).toHaveLength(1));
    expect(rtc.track.enabled).toBe(false);
    expect(mode).toHaveBeenLastCalledWith(expect.objectContaining({ allowsRecording: true, shouldRouteThroughEarpiece: false }));
  });

  it('a refused microphone after the speaker was chosen restores the playback mode, and says so', async () => {
    const prompt = deferred<MicAnswer>();
    await mount(fakeRtc(() => prompt.promise));
    await fireEvent.press(await screen.findByTestId('call-button'));
    await fireEvent.press(await screen.findByLabelText(t.calls.controls.speaker));
    await act(async () => prompt.resolve('denied'));
    expect(await screen.findByText(t.calls.mic.denied)).toBeTruthy();
    expect(mode).toHaveBeenLastCalledWith(PLAYBACK);
  });

  it('refused for good: the notice offers the app\'s settings', async () => {
    await mount(fakeRtc(async () => 'blocked'));
    await fireEvent.press(await screen.findByTestId('call-button'));
    expect(await screen.findByText(t.calls.mic.openSettings)).toBeTruthy();
  });
});

describe('the server rows', () => {
  it('a slow poll begun before the call existed does not end it', async () => {
    const slow = deferred<ReturnType<typeof ringing>[]>();
    let first = true;
    mockFetch.mockImplementation(routes({ config: ON, active: () => (first ? ((first = false), slow.promise) : Promise.resolve([placed])) }));
    await mount();
    await fireEvent.press(await screen.findByTestId('call-button'));
    await waitFor(() => expect(sentTo('/calls')).toBe(true));
    await act(async () => slow.resolve([]));
    expect(screen.getByTestId('call-screen')).toBeTruthy();
    expect(sentTo('/calls/out1/end')).toBe(false);
  });
});
