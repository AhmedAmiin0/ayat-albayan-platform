import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { MoveReason } from './MoveReason';

test('«سبب تغيير الموعد (اختياري)»: a labelled box, the teacher-sees-it hint, typing reported', async () => {
  const onChange = jest.fn();
  await render(<MoveReason value="" onChange={onChange} />);
  expect(screen.getByText(t.reschedule.reasonHint)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(t.reschedule.reason), 'سفر الأسرة');
  expect(onChange).toHaveBeenCalledWith('سفر الأسرة');
});
