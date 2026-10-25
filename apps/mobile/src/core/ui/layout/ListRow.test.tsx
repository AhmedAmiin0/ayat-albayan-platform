import { studentStatusStyle } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from './ListRow';
import { ltr } from '../primitives/Ltr';
import { StatusChip } from '../feedback/StatusChip';

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

test('a tags line wraps under the subtitle; the trailing slot is capped so the name keeps room', async () => {
  await render(
    <ListRow
      title="هدى سالم"
      subtitle="أهلًا بيكي"
      tags={<StatusChip tone="neutral" glyph="hollow" label="a status word long enough to need two lines" size="sm" />}
      trailing={<StatusChip tone="act" glyph="fill" label={t.inbox.unread.one} size="sm" />}
    />,
  );
  expect(screen.getByTestId('list-row-tags')).toHaveStyle({ flexDirection: 'row', flexWrap: 'wrap' });
  expect(screen.getByTestId('list-row-trailing')).toHaveStyle({ flexShrink: 1, maxWidth: '45%' });
  expect(screen.getByText(t.inbox.unread.one)).toHaveStyle({ flexShrink: 1 });
});

test('no trailing, no empty slot (no stray gap at the row end)', async () => {
  await render(<ListRow title="جنى وليد" trailing={null} />);
  expect(screen.queryByTestId('list-row-trailing')).toBeNull();
  expect(screen.queryByTestId('list-row-tags')).toBeNull();
});

test('without onPress there is no dead button', async () => {
  await render(<ListRow title="جنى وليد" />);
  expect(screen.queryByRole('button')).toBeNull();
});
