import { fireEvent, render, screen } from '@testing-library/react-native';
import { shape, type } from '@/theme';
import { ltr } from '@/core/ui/primitives/Ltr';
import { ListRowTitle } from './ListRowTitle';

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity));

test('plain: the body-size title and its meta, no link', async () => {
  await render(<ListRowTitle title="سهيلة" meta="AB-1001" metaStrong />);
  expect(flat(screen.getByText('سهيلة').props.style)).toMatchObject({ fontSize: type.size.body });
  expect(screen.getByText(ltr('AB-1001'))).toBeTruthy();
  expect(screen.queryByRole('link')).toBeNull();
});

test('with a link: the header (lg, bold, one line) is a 44pt spoken link', async () => {
  const onPress = jest.fn();
  const link = { onPress, label: 'فتح ملف الطالب سهيلة' };
  await render(<ListRowTitle title="سهيلة" meta="AB-1001" link={link} />);
  const name = screen.getByText('سهيلة');
  const header = { fontSize: type.size.lg, fontFamily: type.ui[700] };
  expect(flat(name.props.style)).toMatchObject(header);
  expect(name.props.numberOfLines).toBe(1);
  const target = screen.getByRole('link', { name: 'فتح ملف الطالب سهيلة' });
  const slop = target.props.hitSlop as { top: number; bottom: number };
  expect(type.lineHeight(type.size.lg) + slop.top + slop.bottom)
    .toBeGreaterThanOrEqual(shape.control.touch);
  await fireEvent.press(target);
  expect(onPress).toHaveBeenCalledTimes(1);
});
