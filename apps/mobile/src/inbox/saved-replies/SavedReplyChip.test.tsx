import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { shape } from '@/theme';
import { SavedReplyChip } from './SavedReplyChip';

test('one dense line: the remove button is 32pt drawn, 44pt to touch, and removes', async () => {
  const onRemove = jest.fn();
  await render(<SavedReplyChip file={{ name: 'الأسعار.pdf' }} onRemove={onRemove} />);
  const remove = screen.getByRole('button', { name: t.savedReplies.stagedRemove.replace('{name}', 'الأسعار.pdf') });
  expect(shape.control.dense + 2 * remove.props.hitSlop).toBe(shape.control.touch);
  await fireEvent.press(remove);
  expect(onRemove).toHaveBeenCalled();
});
