import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { ChatButton } from './ChatButton';

const C = t.mobileRoom.controls;
const hidden = { includeHiddenElements: true };

test('no unread: the plain chat name and no badge', async () => {
  const onPress = jest.fn();
  await render(<ChatButton unread={0} onPress={onPress} />);
  expect(screen.queryByTestId('room-chat-unread', hidden)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: C.chat }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('unread: the count is in the spoken name and on a badge the reader skips', async () => {
  await render(<ChatButton unread={3} onPress={jest.fn()} />);
  const spoken = t.portal.app.child.chatUnread.replace('{n}', '3');
  expect(screen.getByRole('button', { name: spoken })).toBeTruthy();
  expect(screen.getByTestId('room-chat-unread', hidden)).toHaveTextContent('3');
  expect(screen.queryByTestId('room-chat-unread')).toBeNull();
});
