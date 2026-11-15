import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { nativeRoomPlatform } from './native-platform';

let mockNative: unknown = null;
jest.mock('./livekit-native', () => ({ liveKitNative: () => mockNative }));

test('no LiveKit in the binary: no platform (the route offers the browser)', () => {
  mockNative = null;
  expect(nativeRoomPlatform()).toBeNull();
});

test("the video tiles use the SDK's VideoTrack, the preview the fork's RTCView (mirrored)", async () => {
  mockNative = {
    sdk: {
      VideoTrack: ({ mirror }: { mirror: boolean }) => <View testID={`track-${String(mirror)}`} />,
      AudioSession: {},
    },
    rtc: {
      RTCView: ({ streamURL }: { streamURL: string }) => <View testID={`rtc-${streamURL}`} />,
    },
    lk: {},
  };
  const p = nativeRoomPlatform();
  if (!p) throw new Error('no platform');
  await render(
    <>
      <p.Video video={{}} mirror />
      <p.PreviewVideo streamUrl="s1" />
    </>,
  );
  expect(screen.getByTestId('track-true')).toBeTruthy();
  expect(screen.getByTestId('rtc-s1')).toBeTruthy();
});
