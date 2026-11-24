import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { nativeRoomPlatform } from './native-platform';

let mockNative: unknown = null;
jest.mock('./livekit-native', () => ({ liveKitNative: async () => mockNative }));

test('no LiveKit in the binary: no platform (the route offers the browser)', async () => {
  mockNative = null;
  await expect(nativeRoomPlatform()).resolves.toBeNull();
});

test("the video tiles use the SDK's VideoTrack, the preview the fork's RTCView (mirrored)", async () => {
  mockNative = {
    sdk: {
      VideoTrack: (v: { mirror: boolean; objectFit: string }) => (
        <View testID={`track-${String(v.mirror)}-${v.objectFit}`} />
      ),
      AudioSession: {},
    },
    rtc: {
      RTCView: ({ streamURL }: { streamURL: string }) => <View testID={`rtc-${streamURL}`} />,
    },
    lk: {},
  };
  const p = await nativeRoomPlatform();
  if (!p) throw new Error('no platform');
  await render(
    <>
      <p.Video video={{}} mirror fit="cover" />
      <p.Video video={{}} mirror={false} fit="contain" />
      <p.PreviewVideo streamUrl="s1" />
    </>,
  );
  expect(screen.getByTestId('track-true-cover')).toBeTruthy();
  // A shared screen fits whole (#bug: cover cropped its edges).
  expect(screen.getByTestId('track-false-contain')).toBeTruthy();
  expect(screen.getByTestId('rtc-s1')).toBeTruthy();
});
