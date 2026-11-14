import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { clientAs, tpl } from './fixtures';
import { TemplateCreateScreen } from './TemplateCreateScreen';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(async () => []),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const pill = (c: 'utility' | 'marketing') =>
  screen.getByRole('radio', { name: t.templates.author.categories[c] });

beforeEach(() => jest.clearAllMocks());

test('the category follows the text until the author picks one', async () => {
  await renderWithQuery(<TemplateCreateScreen />, clientAs('sales'));
  const body = screen.getByLabelText(t.templates.create.body);
  await fireEvent.changeText(body, 'موعد حلقتك القادمة غدًا');
  expect(pill('utility').props.accessibilityState).toMatchObject({ checked: true });
  await fireEvent.changeText(body, 'خصم 20% على الباقة');
  expect(pill('marketing').props.accessibilityState).toMatchObject({ checked: true });
  await fireEvent.press(pill('utility'));
  await fireEvent.changeText(body, 'عرض جديد هذا الشهر');
  expect(pill('utility').props.accessibilityState).toMatchObject({ checked: true });
});

test('sends the template with its samples and quick replies, then goes back', async () => {
  mockApiSend.mockResolvedValue(tpl({ status: 'pending' }));
  await renderWithQuery(<TemplateCreateScreen />, clientAs('sales'));
  await fireEvent.changeText(screen.getByLabelText(t.templates.create.body), 'عرض خاص يا {{1}} هذا الشهر');
  await fireEvent.changeText(screen.getByLabelText(t.templates.create.sample.replace('{n}', '1')), 'أحمد');
  await fireEvent.press(screen.getByRole('button', { name: t.templates.create.addReply }));
  await fireEvent.changeText(screen.getByLabelText(t.templates.create.buttonText.replace('{n}', '1')), 'نعم');
  await fireEvent.press(screen.getByRole('button', { name: t.templates.author.submit }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/messaging/templates/authored', {
    key: null,
    category: 'marketing',
    body: 'عرض خاص يا {{1}} هذا الشهر',
    footer: null,
    params: [{ name: 'var_1', sample: 'أحمد' }],
    buttons: [{ type: 'quick_reply', text: 'نعم' }],
  });
});
