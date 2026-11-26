import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../../lib/i18n/i18n';
import { MoveReason } from './MoveReason';

test('«سبب تغيير الموعد (اختياري)»: a labelled box, the teacher-sees-it hint, typing reported', async () => {
  const onChange = jest.fn();
  await render(<MoveReason value="" onChange={onChange} />);
  expect(screen.getByText(t.reschedule.reasonHint)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(t.reschedule.reason), 'سفر الأسرة');
  expect(onChange).toHaveBeenCalledWith('سفر الأسرة');
});

test("the family's note: its own label and no hint", async () => {
  await render(<MoveReason value="" onChange={jest.fn()} label="ملاحظة" hint={null} />);
  expect(screen.getByLabelText('ملاحظة')).toBeTruthy();
  expect(screen.queryByText(t.reschedule.reasonHint)).toBeNull();
});

test("the answer's reply: an example as the placeholder", async () => {
  await render(<MoveReason value="" onChange={jest.fn()} label="ردّ" placeholder="مثلًا: لا وقت" />);
  expect(screen.getByPlaceholderText('مثلًا: لا وقت')).toBeTruthy();
});
