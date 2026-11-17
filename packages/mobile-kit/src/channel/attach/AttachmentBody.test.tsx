import type { ChannelAttachmentView, ChannelMessageView } from '@ab/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import {
  ChannelMediaContext,
  type ChannelMediaPort,
  type ChannelVoiceStatus,
} from '../media-port';
import { channelMessage } from '../testing/channel-fixtures';
import { AttachmentBody } from './AttachmentBody';

const URL = 'https://files.example.org/f';
const file = (over: Partial<ChannelAttachmentView> = {}): ChannelAttachmentView => ({
  ...{ mime: 'application/pdf', size: 245_760, name: 'خطة الحفظ', duration_ms: null, url: URL },
  ...over,
});
const body = (m: Partial<ChannelMessageView>, port: ChannelMediaPort = {}) =>
  render(
    <ChannelMediaContext value={port}>
      <AttachmentBody message={channelMessage(m)} />
    </ChannelMediaContext>,
  );
const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

beforeEach(() => openUrl.mockClear());

test('a PDF: its name and «PDF · 240 كيلوبايت»; a tap opens the file', async () => {
  await body({ kind: 'pdf', attachment: file() });
  expect(screen.getByText('خطة الحفظ')).toBeTruthy();
  expect(screen.getByText(`PDF · ${t.inbox.pdf.kb.replace('{n}', '240')}`)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('channel-pdf'));
  expect(openUrl).toHaveBeenCalledWith(URL);
});

test('a photo: the thumb opens it full size', async () => {
  await body({ kind: 'photo', attachment: file({ mime: 'image/jpeg' }) });
  await fireEvent.press(screen.getByTestId('channel-photo'));
  expect(screen.getByTestId('photo-viewer')).toBeTruthy();
});

test('a voice note plays through the app’s player and shows its clock', async () => {
  let report: (s: ChannelVoiceStatus) => void = () => undefined;
  const player = { toggle: jest.fn(), seek: jest.fn(), release: jest.fn() };
  const playVoice = jest.fn((input: { onStatus: (s: ChannelVoiceStatus) => void }) => {
    report = input.onStatus;
    return player;
  });
  const voice = file({ mime: 'audio/mp4', duration_ms: 65_000 });
  await body({ kind: 'voice', attachment: voice }, { playVoice });
  expect(screen.getByText('1:05')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(/تشغيل/));
  expect(player.toggle).toHaveBeenCalled();
  await act(async () => report({ playing: true, positionMs: 13_000, durationMs: 65_000 }));
  expect(screen.getByText('0:13')).toBeTruthy();
});

test('no player in this app: a voice note opens in the phone’s own', async () => {
  await body({ kind: 'voice', attachment: file({ mime: 'audio/mp4' }) });
  await fireEvent.press(screen.getByLabelText(/تشغيل/));
  expect(openUrl).toHaveBeenCalledWith(URL);
});

test('a deleted file (no link) and a text message show nothing', async () => {
  await body({ kind: 'photo', attachment: file({ url: null }) });
  expect(screen.queryByTestId('channel-photo')).toBeNull();
  await body({ kind: 'text' });
  expect(screen.toJSON()).toBeNull();
});
