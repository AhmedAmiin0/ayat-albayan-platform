import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { NotificationCatalogue } from '@/ops/settings/NotificationCatalogue';
import { answer, catalogueV2, MANAGER, openAudience, savedRow } from './testing/rules-fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));

const c = t.notificationCatalogue;
const r = t.mobileNotificationRules;
const KEY = 'teacher_lesson_reminder';
const switchOff = async () => {
  await renderWithQuery(<NotificationCatalogue />);
  await openAudience(c.audience.teacher);
  const label = r.switchLabel.replace('{name}', c.entries[KEY].name);
  await fireEvent(await screen.findByRole('switch', { name: label }), 'valueChange', false);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(answer(catalogueV2, MANAGER));
});

test('a save answered with the row says it was saved', async () => {
  mockApiSend.mockImplementation(savedRow);
  await switchOff();
  expect(await screen.findByText(r.savedOff.replace('{name}', c.entries[KEY].name))).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', `/admin/notifications/${KEY}`, {
    enabled: false,
  });
});

test('a save whose answer is not a catalogue row is said as failed under its row', async () => {
  mockApiSend.mockResolvedValue({ key: KEY });
  await switchOff();
  expect(await screen.findByText(r.errors.failed)).toBeTruthy();
  expect(screen.queryByText(r.savedOff.replace('{name}', c.entries[KEY].name))).toBeNull();
});
