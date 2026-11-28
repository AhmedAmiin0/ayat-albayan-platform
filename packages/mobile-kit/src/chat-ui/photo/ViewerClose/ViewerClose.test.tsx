import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { ViewerClose } from './ViewerClose';

test('the close button reads the common close word and calls onClose', async () => {
  const onClose = jest.fn();
  await render(<ViewerClose onClose={onClose} />);
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a given label names the button for the screen reader; the word stays close', async () => {
  await render(<ViewerClose onClose={jest.fn()} label="back to chat" />);
  expect(screen.getByRole('button', { name: 'back to chat' })).toBeTruthy();
  expect(screen.getByText(t.common.close)).toBeTruthy();
});
