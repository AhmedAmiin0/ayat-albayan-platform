import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { LeaveSheet } from './LeaveSheet';

const L = t.mobileRoom.leaveAsk;

function draw(open: boolean) {
  const onLeave = jest.fn();
  const onStay = jest.fn();
  return render(<LeaveSheet open={open} onLeave={onLeave} onStay={onStay} />).then(() => ({
    onLeave,
    onStay,
  }));
}

test('closed: the question is not shown', async () => {
  await draw(false);
  expect(screen.queryByTestId('room-leave')).toBeNull();
});

test('asks with a title, leave and stay', async () => {
  const { onLeave, onStay } = await draw(true);
  expect(screen.getByRole('header', { name: L.title })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileRoom.controls.leave }));
  expect(onLeave).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: L.stay }));
  expect(onStay).toHaveBeenCalledTimes(1);
});

test('a drag down, the scrim or back while asking stays in the lesson', async () => {
  const { onLeave, onStay } = await draw(true);
  await fireEvent(screen.getByTestId('room-leave'), 'dismiss');
  expect(onStay).toHaveBeenCalledTimes(1);
  expect(onLeave).not.toHaveBeenCalled();
});
