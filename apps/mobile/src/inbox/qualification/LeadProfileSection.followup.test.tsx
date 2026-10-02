import { lessonWhenText } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { huda } from '../fixtures';
import { deviceTimeZone } from '../message-text';
import { answer, hudaProfile } from './fixtures';
import { LeadProfileSection } from './LeadProfileSection';
import type { LeadProfile } from './queries';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const f = t.followUps;

function serve(row: LeadProfile) {
  mockApiFetch.mockImplementation(answer(row));
  return renderWithQuery(<LeadProfileSection lead={huda} />);
}

beforeEach(() => jest.clearAllMocks());

test('when the next follow-up is due, in the device zone, and how many of the settings’ went out', async () => {
  await serve(hudaProfile);
  const when = lessonWhenText(new Date('2026-10-04T14:00:00Z'), deviceTimeZone());
  expect(await screen.findByText(f.next.replace('{time}', when))).toBeTruthy();
  expect(await screen.findByText(f.stage.replace('{n}', '1').replace('{total}', '3'))).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/settings');
});

test('«وقّف المتابعة» pauses at once: PATCH follow-up, then the answer shows it paused', async () => {
  mockApiSend.mockResolvedValue({ ...hudaProfile, follow_up_paused: true, follow_up_paused_by: 'admin', next_follow_up_at: null });
  await serve(hudaProfile);
  await screen.findByDisplayValue('سهيلة');
  await fireEvent.press(screen.getByRole('button', { name: f.pause }));
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/leads/a1/follow-up', { paused: true });
  expect(await screen.findByText(f.paused)).toBeTruthy();
  expect(screen.getByRole('button', { name: f.resume })).toBeTruthy();
  expect(screen.getByText(t.inbox.followUpSaved)).toBeTruthy();
});

test('paused by the admin: «رجّع المتابعة» resumes without asking', async () => {
  mockApiSend.mockResolvedValue(hudaProfile);
  await serve({ ...hudaProfile, follow_up_paused: true, follow_up_paused_by: 'admin' });
  expect(await screen.findByText(f.paused)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: f.resume }));
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/leads/a1/follow-up', { paused: false });
  expect(screen.queryByText(f.resumeLeadConfirm)).toBeNull();
  expect(await screen.findByRole('button', { name: f.pause })).toBeTruthy();
});

test('the lead sent «وقف» themselves: resuming asks first; «إلغاء» sends nothing', async () => {
  await serve({ ...hudaProfile, follow_up_paused: true, follow_up_paused_by: 'lead' });
  expect(await screen.findByText(f.pausedByLead)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: f.resume }));
  expect(screen.getByText(f.resumeLeadConfirm)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByText(f.resumeLeadConfirm)).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();

  mockApiSend.mockResolvedValue(hudaProfile);
  await fireEvent.press(screen.getByRole('button', { name: f.resume }));
  await fireEvent.press(screen.getByRole('button', { name: f.resumeLeadYes }));
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/leads/a1/follow-up', { paused: false });
  await waitFor(() => expect(screen.queryByText(f.resumeLeadConfirm)).toBeNull());
  expect(screen.getByRole('button', { name: f.pause })).toBeTruthy();
});

test('a refused pause says so under the button and changes nothing', async () => {
  mockApiSend.mockRejectedValue(new Error('500'));
  await serve(hudaProfile);
  await screen.findByDisplayValue('سهيلة');
  await fireEvent.press(screen.getByRole('button', { name: f.pause }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.getByRole('button', { name: f.pause })).toBeTruthy();
});
