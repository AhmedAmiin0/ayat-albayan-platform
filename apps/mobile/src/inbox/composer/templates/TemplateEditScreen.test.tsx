import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { clientAs, tpl } from './fixtures';
import { TemplateEditScreen } from './TemplateEditScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const reminder = tpl({
  key: 'lesson_reminder', meta_name: 'lesson_reminder_v2', body_ar: 'حلقتك {{1}} اليوم', params: ['student'],
  buttons: [{ type: 'url', url: 'https://meet.jit.si/{{1}}', text: 'ادخل' }],
});

beforeEach(() => jest.clearAllMocks());

test('a code-bound template: words only, the same variables, its button kept', async () => {
  mockApiFetch.mockResolvedValue([reminder]);
  mockApiSend.mockResolvedValue({ ...reminder, status: 'pending' });
  await renderWithQuery(<TemplateEditScreen templateKey="lesson_reminder" />, clientAs('admin'));
  const body = await screen.findByLabelText(t.templates.create.body);
  expect(screen.getByText(t.templates.edit.codeBound)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.templates.create.addReply })).toBeNull();
  await fireEvent.changeText(body, 'حلقتك {{1}} مع {{2}} اليوم');
  expect(screen.getByText(t.templates.error.code_bound_variables)).toBeTruthy();
  await fireEvent.changeText(body, 'تبدأ حلقتك {{1}} بعد قليل');
  await fireEvent.press(screen.getByRole('button', { name: t.templates.edit.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalled());
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/messaging/templates/lesson_reminder/content', {
    body: 'تبدأ حلقتك {{1}} بعد قليل',
    footer: null,
    params: [{ name: 'student', sample: 'student' }],
    buttons: [{ type: 'url', text: 'ادخل', url: 'https://meet.jit.si/{{1}}' }],
  });
});

test('sales edit through their own route; a pending one cannot be saved', async () => {
  mockApiFetch.mockResolvedValue([tpl({ status: 'pending' })]);
  await renderWithQuery(<TemplateEditScreen templateKey="summer_offer" />, clientAs('sales'));
  expect(await screen.findByText(t.templates.edit.pendingNote)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/messaging/templates/authored');
  const save = screen.getByRole('button', { name: t.templates.edit.save });
  expect(save.props.accessibilityState).toMatchObject({ disabled: true });
});
