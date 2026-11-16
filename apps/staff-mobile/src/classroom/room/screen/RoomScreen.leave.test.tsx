import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { NavigationContext } from 'expo-router/build/react-navigation/core/NavigationContext';
import type { ComponentProps } from 'react';
import {
  CREDS,
  fakePlatform,
  LESSON,
  withInsets,
  type FakePlatform,
} from '@/classroom/room/state/room-test-kit';
import { t } from '@ab/mobile-kit';
import { RoomScreen } from './RoomScreen';

const R = t.mobileRoom;
let p: FakePlatform;
const onExit = jest.fn();
type Nav = NonNullable<ComponentProps<typeof NavigationContext.Provider>['value']>;
type BeforeRemove = (e: { preventDefault: () => void }) => void;
let beforeRemove: BeforeRemove | null = null;
const nav = {
  addListener: jest.fn((_name: string, fn: BeforeRemove) => {
    beforeRemove = fn;
    return () => {
      beforeRemove = null;
    };
  }),
} as unknown as Nav;
const press = async (label: string) =>
  fireEvent.press(await screen.findByRole('button', { name: label }));

async function live() {
  const fetchJoin = jest.fn(async () => CREDS);
  await render(
    <NavigationContext value={nav}>
      {withInsets(
        <RoomScreen platform={p} target={LESSON} onExit={onExit} fetchJoin={fetchJoin} />,
      )}
    </NavigationContext>,
  );
  await press(R.preview.join);
  await act(async () => p.client.push({ status: 'connected', micOn: true }));
}

beforeEach(() => {
  jest.clearAllMocks();
  p = fakePlatform();
});

test('«غادر» asks first (#bug); «ابقَ في الحلقة» stays, «غادر» leaves and closes', async () => {
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
  expect(onExit).toHaveBeenCalled();
});

test('Android back in the room is held and asks «تغادر الحلقة؟» (#bug: it left at once)', async () => {
  await live();
  const preventDefault = jest.fn();
  await act(async () => beforeRemove?.({ preventDefault }));
  expect(preventDefault).toHaveBeenCalled();
  expect(screen.getByTestId('room-leave')).toBeTruthy();
  expect(p.client.disconnect).not.toHaveBeenCalled();
  // The screen's own exit is let through.
  const ask = within(screen.getByTestId('room-leave'));
  await fireEvent.press(ask.getByRole('button', { name: R.controls.leave }));
  const later = jest.fn();
  beforeRemove?.({ preventDefault: later });
  expect(later).not.toHaveBeenCalled();
});
