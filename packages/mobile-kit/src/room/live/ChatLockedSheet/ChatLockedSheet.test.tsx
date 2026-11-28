import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { ChatLockedSheet } from './ChatLockedSheet';

test('closed: nothing is shown', async () => {
  await render(<ChatLockedSheet open={false} onClose={jest.fn()} />);
  expect(screen.queryByTestId('room-chat-locked')).toBeNull();
});

test('says the chat opens after subscribing; close and a drag down both close it', async () => {
  const onClose = jest.fn();
  await render(<ChatLockedSheet open onClose={onClose} />);
  expect(screen.getByRole('header', { name: t.mobileRoom.controls.chat })).toBeTruthy();
  expect(screen.getByText(t.studentChannel.closed)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  await fireEvent(screen.getByTestId('room-chat-locked'), 'dismiss');
  expect(onClose).toHaveBeenCalledTimes(2);
});
