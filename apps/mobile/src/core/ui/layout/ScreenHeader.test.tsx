import { formatPhone } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Ltr, ltr } from '../primitives/Ltr';
import { ScreenHeader } from './ScreenHeader';

test('one Amiri header, a subtitle, the small mark by default', async () => {
  await render(<ScreenHeader title="الطلاب" subtitle="عرض 25 من 107" />);
  expect(screen.getByRole('header', { name: 'الطلاب' })).toBeTruthy();
  expect(screen.getByText('عرض 25 من 107')).toBeTruthy();
  expect(screen.getByTestId('mark-small', { includeHiddenElements: true })).toBeTruthy();
});

test('trailing replaces the mark', async () => {
  await render(<ScreenHeader title="المزيد" trailing={<Text>x</Text>} />);
  expect(screen.getByText('x')).toBeTruthy();
  expect(screen.queryByTestId('mark-small', { includeHiddenElements: true })).toBeNull();
});

test('Ltr isolates a phone so RTL cannot reorder its groups', async () => {
  await render(<Ltr>{formatPhone('+966552147730')}</Ltr>);
  const text = screen.getByText(ltr('+966 55 214 7730'));
  expect(text).toHaveStyle({ writingDirection: 'ltr', fontVariant: ['tabular-nums'] });
  expect(ltr('AB-0183')).toBe('⁦AB-0183⁩');
});
