import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { FilterPills, type FilterPill } from '../FilterPills';

type Tab = 'upcoming' | 'attended' | 'absent' | 'package' | 'chat';
const words: Record<Tab, string> = {
  upcoming: 'القادمة',
  attended: 'حضرها',
  absent: 'غاب عنها',
  package: 'الباقة',
  chat: 'المحادثة',
};
const items = (unread: number): FilterPill<Tab>[] =>
  (Object.keys(words) as Tab[]).map((value) => ({
    value,
    label: words[value],
    ...(value === 'chat' && { badge: { count: unread, label: `المحادثة، ${unread} غير مقروءة` } }),
  }));

const show = (unread: number, onChange = jest.fn()) =>
  render(
    <FilterPills
      fit
      accessibilityLabel="الأقسام"
      items={items(unread)}
      value="upcoming"
      onChange={onChange}
    />,
  );

test('fit: five tighter pills spread across one row (canvas ChatXFamilyEntry)', async () => {
  await show(0);
  const strip = screen.getByLabelText('الأقسام');
  expect(StyleSheet.flatten(strip.props.contentContainerStyle)).toMatchObject({
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 4,
  });
  const pill = screen.getByRole('tab', { name: 'الباقة' });
  expect(StyleSheet.flatten(pill.props.style)).toMatchObject({ paddingHorizontal: 8 });
});

test('an unread badge: the number after the word, the pill named with it; none at 0', async () => {
  const onChange = jest.fn();
  await show(3, onChange);
  const chat = screen.getByRole('tab', { name: 'المحادثة، 3 غير مقروءة' });
  expect(chat).toHaveTextContent('المحادثة3');
  await fireEvent.press(chat);
  expect(onChange).toHaveBeenCalledWith('chat');
});

test('no unread: the plain word, no number', async () => {
  await show(0);
  expect(screen.getByRole('tab', { name: 'المحادثة' })).toHaveTextContent('المحادثة');
});
