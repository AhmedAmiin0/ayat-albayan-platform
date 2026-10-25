import type { TemplateView } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { TemplateForm } from './TemplateForm';
import { plainReminder } from '../thread-fixtures';

// A chat starter imported from Meta (owner 2026-10-12): its key is its Meta name (not a producer key)
// and it may take more than three variables (var_1…var_n, labelled «المتغير n»).

const IMPORTED: TemplateView = {
  ...plainReminder,
  key: 'academy_welcome',
  meta_name: 'academy_welcome',
  body_ar: '{{1}} {{2}} {{3}} {{4}}',
  footer_ar: null,
  params: ['var_1', 'var_2', 'var_3', 'var_4'],
  line: 'chat',
  sales_starter: true,
};
const field = (n: string) => screen.getByLabelText(t.inbox.composer.param.replace('{n}', n));

test('an imported starter: four fields, then the send carries its own key and every value', async () => {
  const onSend = jest.fn();
  await render(<TemplateForm template={IMPORTED} lessons={[]} onBack={jest.fn()} onSend={onSend} />);
  for (const n of ['1', '2', '3', '4']) await fireEvent.changeText(field(n), `v${n}`);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(onSend).toHaveBeenCalledWith({
    kind: 'template',
    key: 'academy_welcome',
    params: { '1': 'v1', '2': 'v2', '3': 'v3', '4': 'v4' },
    preview: 'v1 v2 v3 v4',
  });
});

test('a missing fourth variable blocks the send', async () => {
  const onSend = jest.fn();
  await render(<TemplateForm template={IMPORTED} lessons={[]} onBack={jest.fn()} onSend={onSend} />);
  for (const n of ['1', '2', '3']) await fireEvent.changeText(field(n), `v${n}`);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(onSend).not.toHaveBeenCalled();
  expect(screen.getByText(t.common.required)).toBeTruthy();
});
