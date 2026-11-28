import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import type { RoomControlsActions } from './RoomControls';
import { RoomControls } from './RoomControls';

const C = t.mobileRoom.controls;
const ON = { micOn: true, camOn: true, output: 'speaker', chatUnread: 0 } as const;

const actions = (): { [K in keyof RoomControlsActions]: jest.Mock } => ({
  toggleMic: jest.fn(),
  toggleCam: jest.fn(),
  nextOutput: jest.fn(),
  openChat: jest.fn(),
  leave: jest.fn(),
});

test('each control calls its action', async () => {
  const a = actions();
  await render(<RoomControls state={ON} actions={a} />);
  const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
  await press(C.mute);
  await press(C.camera);
  await press(C.output.replace('{name}', C.speaker));
  await press(C.chat);
  await press(C.leave);
  expect(a.toggleMic).toHaveBeenCalledTimes(1);
  expect(a.toggleCam).toHaveBeenCalledTimes(1);
  expect(a.nextOutput).toHaveBeenCalledTimes(1);
  expect(a.openChat).toHaveBeenCalledTimes(1);
  expect(a.leave).toHaveBeenCalledTimes(1);
});

test('a room with no chat has no chat control; a muted mic reads as selected', async () => {
  await render(
    <RoomControls state={{ ...ON, micOn: false, chatUnread: null }} actions={actions()} />,
  );
  expect(screen.queryByRole('button', { name: C.chat })).toBeNull();
  expect(screen.getByRole('button', { name: C.mute, selected: true })).toBeTruthy();
});
