import { studentStatusStyle } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { ListRow } from './ListRow';
import { ltr } from './Ltr';
import { StatusChip } from './StatusChip';

test('title, isolated LTR code, subtitle and trailing chip', async () => {
  await render(
    <ListRow
      title="سهيلة محمد"
      meta="AB-0183"
      subtitle="أ. فاطمة الزهراء"
      trailing={<StatusChip {...studentStatusStyle.active} label={t.enums.studentStatus.active} />}
    />,
  );
  expect(screen.getByText('سهيلة محمد')).toBeTruthy();
  expect(screen.getByText(ltr('AB-0183'))).toBeTruthy();
  expect(screen.getByText('أ. فاطمة الزهراء')).toBeTruthy();
  expect(screen.getByText(t.enums.studentStatus.active)).toBeTruthy();
});

test('with onPress it is a 56pt button named by its content', async () => {
  const onPress = jest.fn();
  await render(<ListRow title="يوسف أحمد" onPress={onPress} />);
  const row = screen.getByRole('button', { name: /يوسف أحمد/ });
  expect(row).toHaveStyle({ minHeight: 56 });
  await fireEvent.press(row);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('without onPress there is no dead button', async () => {
  await render(<ListRow title="جنى وليد" />);
  expect(screen.queryByRole('button')).toBeNull();
});
