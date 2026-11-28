import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { RoomPreview } from './RoomPreview';

const R = t.mobileRoom;
const C = R.controls;

const PreviewVideo = ({ streamUrl }: { streamUrl: string }) => <Text>{`video ${streamUrl}`}</Text>;

const preview = (streamUrl: string | null) => ({
  streamUrl,
  wanted: { mic: true, cam: false },
  toggleMic: jest.fn(),
  toggleCam: jest.fn(),
});

test('with a stream: the video, the recorded notice, the toggles and joining', async () => {
  const shown = preview('cam-1');
  const onJoin = jest.fn();
  await render(
    <RoomPreview PreviewVideo={PreviewVideo} preview={shown} notice={null} onJoin={onJoin} />,
  );
  expect(screen.getByText('video cam-1')).toBeTruthy();
  expect(screen.getByText(t.classroom.recordedNotice)).toBeTruthy();
  expect(screen.queryByTestId('room-notice-denied')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: C.mute }));
  await fireEvent.press(screen.getByRole('button', { name: C.camera }));
  await fireEvent.press(screen.getByRole('button', { name: R.preview.join }));
  expect(shown.toggleMic).toHaveBeenCalledTimes(1);
  expect(shown.toggleCam).toHaveBeenCalledTimes(1);
  expect(onJoin).toHaveBeenCalledTimes(1);
});

test('no stream: the camera-off words, and the notice when access was refused', async () => {
  await render(
    <RoomPreview
      PreviewVideo={PreviewVideo}
      preview={preview(null)}
      notice="denied"
      onJoin={jest.fn()}
    />,
  );
  expect(screen.getByText(R.preview.camOff)).toBeTruthy();
  expect(screen.getByTestId('room-notice-denied')).toBeTruthy();
});
