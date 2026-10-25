import type { TemplateView } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { TemplateForm } from './TemplateForm';
import { plainReminder } from '../thread-fixtures';

// trial_reschedule's one variable is the recipient's name: it starts as the thread's display name.

const RESCHEDULE: TemplateView = {
  ...plainReminder,
  key: 'trial_reschedule',
  meta_name: 'trial_reschedule',
  body_ar: 'السلام عليكم {{1}}،\nنودّ إعادة جدولة موعد الحلقة التجريبية.\nما الوقت الذي يناسبكم؟',
  footer_ar: null,
  params: ['contact_name'],
  buttons: [],
  line: 'chat',
  sales_starter: true,
};
const field = () => screen.getByLabelText('اسم المُرسَل إليه');

test('contact_name is labelled, prefilled with the display name, editable, and sent as edited', async () => {
  const onSend = jest.fn();
  await render(<TemplateForm template={RESCHEDULE} lessons={[]} contactName="هدى سالم" onBack={jest.fn()} onSend={onSend} />);
  expect(field().props.value).toBe('هدى سالم');
  await fireEvent.changeText(field(), 'أم يوسف');
  expect(field().props.value).toBe('أم يوسف');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(onSend).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'template', key: 'trial_reschedule', params: { '1': 'أم يوسف' } }),
  );
});

test('without a display name (a new chat) the field starts empty', async () => {
  await render(<TemplateForm template={RESCHEDULE} lessons={[]} contactName={null} onBack={jest.fn()} onSend={jest.fn()} />);
  expect(field().props.value).toBe('');
});
