import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { huda } from '../fixtures';
import { answer, hudaProfile, QUALIFICATION } from './fixtures';
import { LeadProfileSection } from './LeadProfileSection';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const STORED = { ...QUALIFICATION, city: 'جدة', filled_by: 'guardian', group_kind: 'individual' };

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(answer({ ...hudaProfile, qualification: STORED }));
});

const group = (label: string) => within(screen.getByLabelText(label));
const labels = () => screen.getAllByText(/.+/).map((n) => n.props.children);

test('«بيانات الطالب» asks every old-form question, in its words and order', async () => {
  await renderWithQuery(<LeadProfileSection lead={huda} />);
  expect(await screen.findByDisplayValue('جدة')).toBeTruthy();
  expect(screen.getByLabelText(t.leads.studentAge)).toHaveDisplayValue('9');
  expect(
    group(t.leads.filledBy).getByRole('radio', { name: t.leads.filledByOption.guardian }),
  ).toBeChecked();
  expect(
    group(t.leads.groupKind).getByRole('radio', { name: t.leads.groupKindOption.individual }),
  ).toBeChecked();
  for (const label of [
    t.guardians.name,
    t.leads.guardianRelation,
    t.leads.altPhone,
    t.leads.notes,
  ]) {
    expect(screen.getByLabelText(label)).toBeTruthy();
  }
  // The old form: country, then the family; start time, then the zone, then the lesson type.
  const order = [
    t.leads.country,
    t.leads.city,
    t.leads.level,
    t.leads.preferredTime,
    t.leads.groupKind,
  ];
  const shown = labels();
  const at = order.map((l) =>
    shown.findIndex((s) => s === l || (typeof s === 'string' && s.startsWith(l))),
  );
  expect(at).toEqual([...at].sort((a, b) => a - b));
  const tz = shown.findIndex((s) => typeof s === 'string' && s.startsWith(t.leads.tz));
  expect(tz).toBeGreaterThan(at[3] ?? 0);
});

test('«حفظ» sends the family answers; the other number goes as E.164, a bad one is refused', async () => {
  await renderWithQuery(<LeadProfileSection lead={huda} />);
  await screen.findByDisplayValue('جدة');
  await fireEvent.changeText(screen.getByLabelText(t.leads.altPhone), '0101234');
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  expect(screen.getByText(t.common.phoneErrors.missing_country_code)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();

  mockApiSend.mockResolvedValue(hudaProfile);
  await fireEvent.changeText(screen.getByLabelText(t.leads.altPhone), '01012345678');
  await fireEvent.changeText(screen.getByLabelText(t.guardians.name), 'أبو سهيلة');
  await fireEvent.press(
    group(t.leads.groupKind).getByRole('radio', { name: t.leads.groupKindOption.group }),
  );
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/leads/a1/qualification', {
    alt_phone: '+201012345678',
    guardian_name: 'أبو سهيلة',
    group_kind: 'group',
  });
});
