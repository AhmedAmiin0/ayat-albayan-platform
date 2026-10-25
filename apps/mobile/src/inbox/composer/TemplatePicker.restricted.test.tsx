import { RESTRICTED_TEMPLATE_DEFAULTS, type TemplateView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { plainReminder } from '../shared/thread-fixtures';
import { TemplatePicker } from './TemplatePicker';

// Owner 2026-10-12: every role without templates.manage / templates.send_all gets only the allow-list.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
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
// The allow-list as staging has it: free_trial_invite and welcome_greeting take no params.
const STARTERS: TemplateView[] = [
  { ...INVITE, body_ar: 'ندعوكم إلى حلقة تجريبية مجانية', params: [] },
  { ...INVITE, key: 'welcome_greeting', meta_name: 'welcome_greeting', body_ar: 'أهلًا بكم في الأكاديمية', params: [] },
  { ...INVITE, key: 'trial_reschedule', meta_name: 'trial_reschedule', body_ar: 'أهلًا {{1}}', params: ['contact_name'] },
];
const names: Record<string, string> = t.templates.names;
const onSend = jest.fn();

function show(rows: TemplateView[], permissions: string[], role = 'teacher') {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/auth/me' ? { id: 'u1', role, permissions } : rows));
  return renderWithQuery(<TemplatePicker visible lessons={[]} teacher={false} onClose={jest.fn()} onSend={onSend} />);
}

beforeEach(() => {
  mockApiFetch.mockReset();
  onSend.mockReset();
});

test('a restricted role picks free_trial_invite and gets its «المتغير n» fields, no lesson to pick', async () => {
  await show([INVITE], ['inbox.send', 'messages.read']);
  await fireEvent.press(await screen.findByText(t.templates.names.free_trial_invite));
  expect(screen.getByLabelText(t.inbox.composer.param.replace('{n}', '1'))).toBeTruthy();
  expect(screen.getByLabelText(t.inbox.composer.param.replace('{n}', '2'))).toBeTruthy();
  expect(screen.queryByRole('radiogroup')).toBeNull();
});

test('the assistant reads each default by its Arabic name, never a Meta key, and sends welcome_greeting', async () => {
  await show(STARTERS, ['inbox.send', 'messages.read'], 'sales');
  for (const key of RESTRICTED_TEMPLATE_DEFAULTS) {
    expect(names[key]).toBeTruthy();
    expect(await screen.findByText(names[key] ?? key)).toBeTruthy();
    expect(screen.queryByText(key)).toBeNull();
  }
  await fireEvent.press(screen.getByText(t.templates.names.welcome_greeting));
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ kind: 'template', key: 'welcome_greeting', params: {} }));
});

test('while the list loads the sheet says so, not an empty white page', async () => {
  const me = { id: 'u1', role: 'sales', permissions: ['messages.read'] };
  mockApiFetch.mockImplementation((path: string) => (path === '/auth/me' ? Promise.resolve(me) : new Promise(() => undefined)));
  await renderWithQuery(<TemplatePicker visible lessons={[]} teacher={false} onClose={jest.fn()} onSend={onSend} />);
  expect(await screen.findByText(t.common.loading)).toBeTruthy();
  expect(screen.queryByText(t.inbox.composer.noAllowed)).toBeNull();
});

test('nothing on the list: «لا توجد قوالب متاحة لك بعد»', async () => {
  await show([], ['messages.read']);
  expect(await screen.findByText(t.inbox.composer.noAllowed)).toBeTruthy();
  expect(screen.queryByText(t.inbox.composer.noApproved)).toBeNull();
});

test('templates.send_all (or templates.manage) keeps the plain empty note', async () => {
  await show([], ['messages.read', 'templates.send_all'], 'admin');
  expect(await screen.findByText(t.inbox.composer.noApproved)).toBeTruthy();
});

test.each(['sales', 'teacher'])('%s stays on the allow-list even when granted templates.manage (owner 2026-10-15, 10-18)', async (role) => {
  await show([], ['messages.read', 'templates.manage', 'templates.send_all'], role);
  expect(await screen.findByText(t.inbox.composer.noAllowed)).toBeTruthy();
  expect(screen.queryByText(t.inbox.composer.noApproved)).toBeNull();
});
