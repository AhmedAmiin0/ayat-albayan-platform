import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { clientAs, ME, tpl } from './fixtures';
import { TemplatesScreen } from './TemplatesScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const rows = [
  tpl({ key: 'mine_offer', meta_name: 'mine_offer', status: 'pending', created_by: ME }),
  tpl({ key: 'old_offer', meta_name: 'old_offer', status: 'rejected', last_error: 'INVALID_FORMAT' }),
  tpl({ key: 'lesson_reminder', meta_name: 'lesson_reminder', status: 'approved' }),
  tpl({ key: 'quiet', meta_name: 'quiet', status: 'paused' }),
];

beforeEach(() => jest.clearAllMocks());

test('sales: the author list with status chips, the reason, and the badges', async () => {
  mockApiFetch.mockResolvedValue(rows);
  await renderWithQuery(<TemplatesScreen base="/sales/more/templates" />, clientAs('sales'));
  expect(await screen.findByText('mine_offer')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/messaging/templates/authored');
  const words = t.templates.author.status;
  for (const w of [words.pending, words.rejected, words.approved, words.other]) {
    expect(screen.getByText(w)).toBeTruthy();
  }
  expect(screen.getByText(t.templates.author.rejectedReason.replace('{reason}', 'INVALID_FORMAT'))).toBeTruthy();
  expect(screen.getByText(t.templates.author.mine)).toBeTruthy();
  expect(screen.getByText(t.templates.author.codeBound)).toBeTruthy();
});

test('sales edit only a template authorMayEdit allows; «قالب جديد» opens the form', async () => {
  mockApiFetch.mockResolvedValue(rows);
  await renderWithQuery(<TemplatesScreen base="/sales/more/templates" />, clientAs('sales'));
  await fireEvent.press(await screen.findByRole('button', { name: /^old_offer/ }));
  expect(router.push).toHaveBeenCalledWith('/sales/more/templates/old_offer');
  // Code-bound and pending ones are plain rows (no button).
  expect(screen.queryByRole('button', { name: /^lesson_reminder/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /^mine_offer/ })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.templates.author.new }));
  expect(router.push).toHaveBeenCalledWith('/sales/more/templates/new');
});

test('the admin lists every template and edits a code-bound one too', async () => {
  mockApiFetch.mockResolvedValue(rows);
  await renderWithQuery(<TemplatesScreen base="/more/templates" />, clientAs('admin'));
  await fireEvent.press(await screen.findByRole('button', { name: /^lesson_reminder/ }));
  expect(mockApiFetch).toHaveBeenCalledWith('/messaging/templates');
  expect(router.push).toHaveBeenCalledWith('/more/templates/lesson_reminder');
});
