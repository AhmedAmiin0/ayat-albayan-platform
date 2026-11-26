import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { ChannelSheetHeader } from './ChannelSheetHeader';

test('the sheet head: the title, the people and «إغلاق المحادثة»', async () => {
  const onClose = jest.fn();
  await render(<ChannelSheetHeader title="المحادثة" names="فاطمة، أنت" onClose={onClose} />);
  expect(screen.getByRole('header', { name: 'المحادثة' })).toBeTruthy();
  expect(screen.getByText('فاطمة، أنت')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.studentChannel.closeChat }));
  expect(onClose).toHaveBeenCalled();
});

test('nothing loaded yet: no people line', async () => {
  await render(<ChannelSheetHeader title="المحادثة" names="" onClose={jest.fn()} />);
  expect(screen.queryByText('فاطمة، أنت')).toBeNull();
});
