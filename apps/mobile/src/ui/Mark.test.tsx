import { render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { Mark } from './Mark';

const hidden = { includeHiddenElements: true };

test('labelled mark is an image named «آيات البيان»', async () => {
  await render(<Mark size={56} labelled />);
  expect(screen.getByLabelText(t.app.brand)).toBeTruthy();
  expect(screen.getByRole('image')).toBeTruthy();
});

test('32pt and below show the Mushaf crop, larger sizes the full emblem', async () => {
  await render(<Mark size={28} />);
  expect(screen.getByTestId('mark-small', hidden)).toBeTruthy();
  await render(<Mark size={32} />);
  expect(screen.getByTestId('mark-small', hidden)).toBeTruthy();
  await render(<Mark size={33} />);
  expect(screen.getByTestId('mark-large', hidden)).toBeTruthy();
});

test('a square box with the emblem contained, so its aspect never distorts', async () => {
  await render(<Mark size={56} />);
  const img = screen.getByTestId('mark-large', hidden);
  expect(img.props.style).toEqual({ width: 56, height: 56 });
  expect(img.props.resizeMode).toBe('contain');
});

test('decorative mark stays out of the accessibility tree', async () => {
  await render(<Mark />);
  expect(screen.queryByLabelText(t.app.brand)).toBeNull();
  expect(screen.queryByRole('image')).toBeNull();
});
