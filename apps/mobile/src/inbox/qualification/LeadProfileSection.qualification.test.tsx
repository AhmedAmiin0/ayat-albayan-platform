import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { listKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { cachedList, huda } from '../shared/fixtures';
import { findCachedLead } from '../leads/detail/use-cached-lead';
import { answer, hudaProfile, QUALIFICATION } from './fixtures';
import { LeadProfileSection } from './LeadProfileSection';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(answer(hudaProfile));
});

/** The cached inbox row (no qualification in it), then the fresh row from GET /leads?q=phone. */
async function open() {
  const client = createTestQueryClient();
  client.setQueryData(listKey('/leads', { q: '' }), cachedList([huda]));
  await renderWithQuery(<LeadProfileSection lead={huda} />, client);
  expect(await screen.findByDisplayValue('سهيلة')).toBeTruthy();
  return client;
}

const group = (label: string) => within(screen.getByLabelText(label));
const save = () => fireEvent.press(screen.getByRole('button', { name: t.common.save }));

test('the stored answers, picked not typed: age, gender, zone, days, time range', async () => {
  await open();
  expect(mockApiFetch).toHaveBeenCalledWith('/leads?q=%2B966552147730&page=1&pageSize=5');
  expect(screen.getByLabelText(t.leads.studentAge)).toHaveDisplayValue('9');
  expect(group(t.leads.gender).getByRole('radio', { name: t.enums.gender.female })).toBeChecked();
  expect(group(t.leads.tz).getByRole('radio', { name: t.tz['Asia/Riyadh'] })).toBeChecked();
  expect(group(t.leads.availableDays).getByRole('checkbox', { name: t.enums.weekday['0'] })).toBeChecked();
  expect(group(t.leads.availableDays).getByRole('checkbox', { name: t.enums.weekday['4'] })).toBeChecked();
  expect(group(t.leads.availableDays).getByRole('checkbox', { name: t.enums.weekday['1'] })).not.toBeChecked();
  expect(group(t.availability.from).getByRole('radio', { name: '16:00' })).toBeChecked();
  expect(group(t.availability.to).getByRole('radio', { name: '18:00' })).toBeChecked();
  // The picks are named in their labels too: a long pill row may have them off screen.
  expect(screen.getByText(`${t.availability.from} 16:00`)).toBeTruthy();
  expect(screen.getByText(`${t.leads.tz} · ${t.tz['Asia/Riyadh']}`)).toBeTruthy();
});

test('«حفظ» sends only what changed, then the saved row is the lead in every cached list', async () => {
  const client = await open();
  const saved = { ...QUALIFICATION, goal: 'ختم جزء عم', available_days: [0, 1, 4] };
  mockApiSend.mockResolvedValue({ ...hudaProfile, qualification: saved });
  await fireEvent.changeText(screen.getByLabelText(t.leads.goal), ' ختم جزء عم ');
  await fireEvent.press(group(t.leads.availableDays).getByRole('checkbox', { name: t.enums.weekday['1'] }));
  await save();
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/leads/a1/qualification', {
    goal: 'ختم جزء عم',
    available_days: [0, 1, 4],
  });
  expect(await screen.findByText(t.inbox.qualificationSaved)).toBeTruthy();
  expect(findCachedLead(client, 'a1')).toMatchObject({ qualification: saved });
});

test('the saved values become the baseline: the next save sends only the newer change', async () => {
  await open();
  mockApiSend.mockResolvedValue(hudaProfile);
  await fireEvent.changeText(screen.getByLabelText(t.leads.riwaya), 'حفص');
  await save();
  await screen.findByText(t.inbox.qualificationSaved);
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentAge), '10');
  expect(screen.queryByText(t.inbox.qualificationSaved)).toBeNull();
  await save();
  expect(mockApiSend).toHaveBeenLastCalledWith('PATCH', '/leads/a1/qualification', { age: 10 });
});

test('«—» clears a choice (sent as null); with nothing changed nothing is sent', async () => {
  await open();
  await save();
  expect(mockApiSend).not.toHaveBeenCalled();
  mockApiSend.mockResolvedValue(hudaProfile);
  await fireEvent.press(group(t.leads.gender).getByRole('radio', { name: t.common.unset }));
  await fireEvent.press(group(t.availability.from).getByRole('radio', { name: t.common.unset }));
  await save();
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/leads/a1/qualification', {
    gender: null,
    preferred_from: null,
  });
});

test('an end before the start, or an impossible age, is refused in words and not sent', async () => {
  await open();
  await fireEvent.press(group(t.availability.to).getByRole('radio', { name: '15:00' }));
  await save();
  expect(screen.getByText(t.common.endBeforeStart)).toBeTruthy();
  await fireEvent.press(group(t.availability.to).getByRole('radio', { name: '18:00' }));
  await fireEvent.changeText(screen.getByLabelText(t.leads.studentAge), '1');
  await save();
  expect(screen.getByText(t.students.ageInvalid)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a lead with no answers yet: an empty form, nothing picked', async () => {
  mockApiFetch.mockImplementation(answer({ ...hudaProfile, qualification: {} }));
  await renderWithQuery(<LeadProfileSection lead={huda} />);
  expect(await screen.findByRole('button', { name: t.common.save })).toBeTruthy();
  expect(screen.getByLabelText(t.leads.studentName)).toHaveDisplayValue('');
  expect(group(t.leads.gender).getByRole('radio', { name: t.common.unset })).toBeChecked();
  expect(group(t.leads.availableDays).queryAllByRole('checkbox', { checked: true })).toHaveLength(0);
});
