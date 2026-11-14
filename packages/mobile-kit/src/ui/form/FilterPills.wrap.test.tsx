import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { FilterPills } from './FilterPills';

const items = ['القاهرة', 'الرياض', 'دبي', 'الدوحة'].map((label) => ({ value: label, label }));

test('wrap: a picker keeps every option on screen in rows (no hidden scroll), and still picks', async () => {
  const onChange = jest.fn();
  await render(<FilterPills role="radiogroup" wrap accessibilityLabel="المنطقة" items={items} value="القاهرة" onChange={onChange} />);
  const group = screen.getByLabelText('المنطقة');
  expect(StyleSheet.flatten(group.props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
  expect(screen.getAllByRole('radio')).toHaveLength(4);
  await fireEvent.press(screen.getByRole('radio', { name: 'دبي' }));
  expect(onChange).toHaveBeenCalledWith('دبي');
});

test('default: the scrolling one-row strip for filters', async () => {
  await render(<FilterPills accessibilityLabel="الحالة" items={items} value="دبي" onChange={jest.fn()} />);
  expect(screen.getByLabelText('الحالة').props.horizontal).toBe(true);
});
