import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Card } from './Card';
import { GradePills } from './GradePills';
import { Pills } from './Pills';

test('radio pills: one checked, each press reported, nothing pressable when disabled', async () => {
  const onPress = jest.fn();
  const items = [
    { value: 'a', label: 'أ' },
    { value: 'b', label: 'ب' },
  ] as const;
  const { rerender } = await render(
    <Pills label="مجموعة" items={items} isOn={(v) => v === 'b'} onPress={onPress} layout="grid" />,
  );
  expect(screen.getByLabelText('مجموعة').props.accessibilityRole).toBe('radiogroup');
  expect(screen.getByRole('radio', { name: 'ب', checked: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: 'أ' }));
  expect(onPress).toHaveBeenCalledWith('a');
  await rerender(
    <Pills
      label="مجموعة"
      items={items}
      isOn={() => false}
      onPress={onPress}
      role="checkbox"
      disabled
    />,
  );
  expect(screen.getByRole('checkbox', { name: 'أ' }).props.accessibilityState).toMatchObject({
    disabled: true,
    checked: false,
  });
});

test('grade pills: the five grades as «تقييم …», in a titled card with its aside and «(اختياري)»', async () => {
  const onChange = jest.fn();
  await render(
    <Card title="التسميع" aside="15 آية" optional>
      <GradePills title="التسميع" value="good" onChange={onChange} />
    </Card>,
  );
  expect(screen.getByText('15 آية')).toBeTruthy();
  expect(screen.getByText(new RegExp(t.reports.v2.optional.replace(/[()]/g, '\\$&')))).toBeTruthy();
  expect(screen.getByLabelText(t.reports.v2.rateOf.replace('{title}', 'التسميع'))).toBeTruthy();
  expect(screen.getAllByRole('radio')).toHaveLength(5);
  expect(screen.getByRole('radio', { name: t.enums.grade.good, checked: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.grade.excellent }));
  expect(onChange).toHaveBeenCalledWith('excellent');
});
