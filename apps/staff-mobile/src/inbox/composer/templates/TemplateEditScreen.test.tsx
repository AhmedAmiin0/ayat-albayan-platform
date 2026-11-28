import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { clientAs, tpl } from './fixtures';
import { TemplateEditScreen } from './TemplateEditScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const reminder = tpl({
  key: 'lesson_reminder',
  meta_name: 'lesson_reminder_v2',
  body_ar: 'حلقتك {{1}} اليوم',
  params: ['student'],
  buttons: [{ type: 'url', url: 'https://meet.jit.si/{{1}}', text: 'ادخل' }],
});

beforeEach(() => jest.clearAllMocks());

test('a code-bound template: words only, the same variables, its button kept', async () => {
  mockApi.onRead(() => [reminder]);
  mockApi.onWrite(() => ({ ...reminder, status: 'pending' }));
  await renderWithQuery(<TemplateEditScreen templateKey="lesson_reminder" />, clientAs('admin'));
  const body = await screen.findByLabelText(t.templates.create.body);
  expect(screen.getByText(t.templates.edit.codeBound)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.templates.create.addReply })).toBeNull();
  await fireEvent.changeText(body, 'حلقتك {{1}} مع {{2}} اليوم');
  expect(screen.getByText(t.templates.error.code_bound_variables)).toBeTruthy();
  await fireEvent.changeText(body, 'تبدأ حلقتك {{1}} بعد قليل');
  await fireEvent.press(screen.getByRole('button', { name: t.templates.edit.save }));
  await waitFor(() => expect(mockApi.writes()).not.toHaveLength(0));
  expect(mockApi.writes()).toContainEqual({
    method: 'PATCH',
    path: '/messaging/templates/lesson_reminder/content',
    body: {
      body: 'تبدأ حلقتك {{1}} بعد قليل',
      footer: null,
      params: [{ name: 'student', sample: 'student' }],
      buttons: [{ type: 'url', text: 'ادخل', url: 'https://meet.jit.si/{{1}}' }],
    },
  });
});

test('sales edit through their own route; a pending one cannot be saved', async () => {
  mockApi.onRead(() => [tpl({ status: 'pending' })]);
  await renderWithQuery(<TemplateEditScreen templateKey="summer_offer" />, clientAs('sales'));
  expect(await screen.findByText(t.templates.edit.pendingNote)).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/messaging/templates/authored' });
  const save = screen.getByRole('button', { name: t.templates.edit.save });
  expect(save.props.accessibilityState).toMatchObject({ disabled: true });
});
