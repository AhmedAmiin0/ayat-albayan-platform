import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import {
  CREDS,
  fakePlatform,
  LESSON,
  withInsets,
  type FakePlatform,
} from '../../../state/room-test-kit';
import { t } from '../../../../lib/i18n/i18n';
import { RoomScreen } from '../RoomScreen';
import type { BackSource, BeforeRemove } from '../../use-leave-guard';

const R = t.mobileRoom;
let p: FakePlatform;
const onExit = jest.fn();
let beforeRemove: ((e: BeforeRemove) => void) | null = null;
const backSource: BackSource = (fn) => {
  beforeRemove = fn;
  return () => {
    beforeRemove = null;
  };
};
const press = async (label: string) =>
  fireEvent.press(await screen.findByRole('button', { name: label }));

async function live() {
  const fetchJoin = jest.fn(async () => CREDS);
  await render(
    withInsets(
      <RoomScreen
        platform={p}
        target={LESSON}
        onExit={onExit}
        fetchJoin={fetchJoin}
        backSource={backSource}
      />,
    ),
  );
  await press(R.preview.join);
  await act(async () => p.client.push({ status: 'connected', micOn: true }));
}

beforeEach(() => {
  jest.clearAllMocks();
  p = fakePlatform();
});

test('«غادر» asks first (#bug); «ابقَ في الحلقة» stays; «غادر» leaves to RoomXLeft', async () => {
  await live();
  await press(R.controls.leave);
  expect(screen.getByText(R.leaveAsk.title)).toBeTruthy();
  await press(R.leaveAsk.stay);
  expect(screen.queryByTestId('room-leave')).toBeNull();
  expect(p.client.disconnect).not.toHaveBeenCalled();
  await press(R.controls.leave);
  const ask = within(screen.getByTestId('room-leave'));
  await fireEvent.press(ask.getByRole('button', { name: R.controls.leave }));
  expect(p.client.disconnect).toHaveBeenCalled();
  expect(p.audio.stop).toHaveBeenCalled();
  // The screen stays: «خرجت من الحلقة» with «ادخل مرة أخرى»; only «رجوع» exits.
  expect(screen.getByTestId('room-closed-left')).toBeTruthy();
  expect(screen.getByText(R.left.body)).toBeTruthy();
  expect(onExit).not.toHaveBeenCalled();
  await press(R.back);
  expect(onExit).toHaveBeenCalled();
});

test('Android back in the room is held and asks «تغادر الحلقة؟» (#bug: it left at once)', async () => {
  await live();
  const preventDefault = jest.fn();
  await act(async () => beforeRemove?.({ preventDefault, data: { action: { type: 'GO_BACK' } } }));
  expect(preventDefault).toHaveBeenCalled();
  expect(screen.getByTestId('room-leave')).toBeTruthy();
  expect(p.client.disconnect).not.toHaveBeenCalled();
  // A sign-out (RESET) or a replace still navigates away.
  const reset = jest.fn();
  beforeRemove?.({ preventDefault: reset, data: { action: { type: 'RESET' } } });
  expect(reset).not.toHaveBeenCalled();
  // Left: the guard lets go.
  const ask = within(screen.getByTestId('room-leave'));
  await fireEvent.press(ask.getByRole('button', { name: R.controls.leave }));
  expect(beforeRemove).toBeNull();
});
