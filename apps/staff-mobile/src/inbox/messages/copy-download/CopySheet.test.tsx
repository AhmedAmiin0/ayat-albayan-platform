import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { CopySheet } from './CopySheet';

const REQUEST = { title: t.inbox.copy.label, text: 'السلام عليكم' };

test('closed while there is nothing to copy', async () => {
  await render(<CopySheet request={null} onClose={jest.fn()} />);
  expect(screen.queryByTestId('copy-sheet')).toBeNull();
});

test('the title, the hint and the text to select, selectable', async () => {
  await render(<CopySheet request={REQUEST} onClose={jest.fn()} />);
  const sheet = within(screen.getByTestId('copy-sheet'));
  expect(sheet.getByRole('header', { name: REQUEST.title })).toBeTruthy();
  expect(sheet.getByText(t.inbox.copy.hint)).toBeTruthy();
  expect(screen.getByTestId('copy-text').props.selectable).toBe(true);
});

test('«إغلاق» and a drag down both close it', async () => {
  const onClose = jest.fn();
  await render(<CopySheet request={REQUEST} onClose={onClose} />);
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  await fireEvent(screen.getByTestId('copy-sheet'), 'dismiss');
  expect(onClose).toHaveBeenCalledTimes(2);
});
