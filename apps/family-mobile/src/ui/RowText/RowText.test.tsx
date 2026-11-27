import { render, screen } from '@testing-library/react-native';
import { RowText } from './RowText';

test('the title, its line and each note', async () => {
  const notes = [
    { text: 'تسجيل', tone: 'link' },
    { text: 'ملاحظة', tone: 'quiet' },
  ] as const;
  await render(<RowText title="الحلقة" line="مع فاطمة" notes={notes} />);
  expect(screen.getByText('الحلقة')).toBeTruthy();
  expect(screen.getByText('مع فاطمة')).toBeTruthy();
  expect(screen.getByText('ملاحظة').props.style).not.toEqual(screen.getByText('تسجيل').props.style);
});

test('no line and no notes: the title alone', async () => {
  await render(<RowText title="الحلقة" line={null} />);
  expect(screen.getByText('الحلقة')).toBeTruthy();
  expect(screen.toJSON()).toMatchObject({ children: [expect.anything()] });
});
