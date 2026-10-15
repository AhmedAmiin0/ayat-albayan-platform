import type { TemplateView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { plainReminder } from './thread-fixtures';
import { TemplatePicker } from './TemplatePicker';

// Owner 2026-10-12: every role without templates.manage / templates.send_all gets only the allow-list.
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const INVITE: TemplateView = {
  ...plainReminder,
  key: 'free_trial_invite',
  meta_name: 'free_trial_invite',
  body_ar: 'أهلًا {{1}}، موعد {{2}}',
  footer_ar: null,
  params: ['var_1', 'var_2'],
  buttons: [],
  line: 'chat',
  sales_starter: true,
};

function show(rows: TemplateView[], permissions: string[], role = 'teacher') {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/auth/me' ? { id: 'u1', role, permissions } : rows));
  return renderWithQuery(<TemplatePicker visible lessons={[]} teacher={false} onClose={jest.fn()} onSend={jest.fn()} />);
}

beforeEach(() => mockApiFetch.mockReset());

test('a restricted role picks free_trial_invite and gets its «المتغير n» fields, no lesson to pick', async () => {
  await show([INVITE], ['inbox.send', 'messages.read']);
  await fireEvent.press(await screen.findByText('free_trial_invite'));
  expect(screen.getByLabelText(t.inbox.composer.param.replace('{n}', '1'))).toBeTruthy();
  expect(screen.getByLabelText(t.inbox.composer.param.replace('{n}', '2'))).toBeTruthy();
  expect(screen.queryByRole('radiogroup')).toBeNull();
});

test('nothing on the list: «لا توجد قوالب متاحة لك بعد»', async () => {
  await show([], ['messages.read']);
  expect(await screen.findByText(t.inbox.composer.noAllowed)).toBeTruthy();
  expect(screen.queryByText(t.inbox.composer.noApproved)).toBeNull();
});

test('templates.send_all (or templates.manage) keeps the plain empty note', async () => {
  await show([], ['messages.read', 'templates.send_all']);
  expect(await screen.findByText(t.inbox.composer.noApproved)).toBeTruthy();
});

test('an assistant (sales) stays on the allow-list even when granted templates.manage (owner 2026-10-15)', async () => {
  await show([], ['messages.read', 'templates.manage', 'templates.send_all'], 'sales');
  expect(await screen.findByText(t.inbox.composer.noAllowed)).toBeTruthy();
  expect(screen.queryByText(t.inbox.composer.noApproved)).toBeNull();
});
