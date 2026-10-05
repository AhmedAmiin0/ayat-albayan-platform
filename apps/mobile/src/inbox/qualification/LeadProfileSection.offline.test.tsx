import { lessonWhenText } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { huda } from '../fixtures';
import { deviceTimeZone } from '../message-text';
import { answer, hudaProfile, noNetwork } from './fixtures';
import { LeadProfileSection } from './LeadProfileSection';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

let online = true;
beforeEach(() => {
  jest.clearAllMocks();
  online = true;
  mockApiFetch.mockImplementation((path: string) => (online ? answer(hudaProfile)(path) : Promise.reject(noNetwork())));
});

const offlineLine = t.leads.mobile.offline;

test('no answer: says so once; the cached answers stay readable; no save, no pause', async () => {
  online = false;
  await renderWithQuery(<LeadProfileSection lead={hudaProfile} />);
  expect(await screen.findByText(offlineLine)).toBeTruthy();
  expect(screen.getAllByText(offlineLine)).toHaveLength(1);
  expect(screen.getByDisplayValue('سهيلة')).toBeTruthy();
  const when = lessonWhenText(new Date('2026-10-04T14:00:00Z'), deviceTimeZone());
  expect(screen.getByText(t.followUps.next.replace('{time}', when))).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.common.save })).toBeNull();
  expect(screen.queryByRole('button', { name: t.followUps.pause })).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('«حاول مرة أخرى» gets an answer: the line goes and saving and pausing are back', async () => {
  online = false;
  await renderWithQuery(<LeadProfileSection lead={huda} />);
  await screen.findByText(offlineLine);
  online = true;
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByRole('button', { name: t.common.save })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.followUps.pause })).toBeTruthy();
  expect(screen.queryByText(offlineLine)).toBeNull();
  // The fresh row replaced the cached one, which had no answers yet.
  expect(screen.getByDisplayValue('سهيلة')).toBeTruthy();
});

test('a save that gets no answer says offline and keeps the edit; a refused one, the generic line', async () => {
  await renderWithQuery(<LeadProfileSection lead={huda} />);
  await screen.findByDisplayValue('سهيلة');
  await fireEvent.changeText(screen.getByLabelText(t.leads.goal), 'ختم جزء عم');
  mockApiSend.mockRejectedValueOnce(noNetwork());
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  expect(await screen.findByText(offlineLine)).toBeTruthy();
  expect(screen.getByDisplayValue('ختم جزء عم')).toBeTruthy();

  mockApiSend.mockRejectedValueOnce(new ApiError(500));
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledTimes(2);
  expect(mockApiSend).toHaveBeenLastCalledWith('PATCH', '/leads/a1/qualification', { goal: 'ختم جزء عم' });
});
