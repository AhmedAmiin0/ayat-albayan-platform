import { render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { Mark } from './Mark';

test('labelled mark is an image named «آيات البيان»', async () => {
  await render(<Mark size={56} labelled />);
  expect(screen.getByLabelText(t.app.brand)).toBeTruthy();
  expect(screen.getByRole('image')).toBeTruthy();
});

test('28px and below use logo-small, larger sizes the full mark', async () => {
  const hidden = { includeHiddenElements: true };
  await render(<Mark size={28} />);
  expect(screen.getByTestId('mark-small', hidden)).toBeTruthy();
  await render(<Mark size={56} />);
  expect(screen.getByTestId('mark-large', hidden)).toBeTruthy();
});

test('decorative mark stays out of the accessibility tree', async () => {
  await render(<Mark />);
  expect(screen.queryByLabelText(t.app.brand)).toBeNull();
  expect(screen.queryByRole('image')).toBeNull();
});
