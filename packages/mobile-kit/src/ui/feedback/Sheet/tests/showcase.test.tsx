import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../../lib/i18n/i18n';
import { SheetShowcase } from '../Sheet.showcase';

const KEYS = ['fit', 'untitled', 'large', 'room', 'ltr'];

test.each(KEYS)('the «%s» case opens from its button and closes from its own', async (key) => {
  await render(<SheetShowcase />);
  expect(screen.queryByTestId(`showcase-${key}`)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: key }));
  expect(screen.getByTestId(`showcase-${key}`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(screen.queryByTestId(`showcase-${key}`)).toBeNull();
});

test('only one case is open at a time; a drag down closes it', async () => {
  await render(<SheetShowcase />);
  await fireEvent.press(screen.getByRole('button', { name: 'large' }));
  expect(screen.getAllByRole('button', { name: t.common.close })).toHaveLength(1);
  await fireEvent(screen.getByTestId('showcase-large'), 'dismiss');
  expect(screen.queryByTestId('showcase-large')).toBeNull();
});
