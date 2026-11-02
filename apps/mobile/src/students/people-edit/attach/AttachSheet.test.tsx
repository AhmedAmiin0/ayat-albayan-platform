import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { clientWith, PEOPLE_KEYS, VIEW } from '@/students/people-edit/people-edit.fixtures';
import { PeopleEditSection } from '@/students/people-edit/PeopleEditSection';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const E = t.peopleEdit;
const OTHER = {
  id: 'g2',
  name: 'أبو خالد',
  phone_e164: '+201000000009',
  students: [{ code: 'AB-0190', name: 'خالد' }],
};

beforeEach(() => {
  jest.useFakeTimers();
  mockApiFetch
    .mockReset()
    .mockImplementation(async (path: string) =>
      path.startsWith('/people/guardians') ? [OTHER] : VIEW,
    );
  mockApiSend.mockReset().mockResolvedValue({ guardian_id: 'g2' });
});
afterEach(() => jest.useRealTimers());

async function open() {
  await renderWithQuery(<PeopleEditSection studentId="s1" />, clientWith(PEOPLE_KEYS));
  await fireEvent.press(screen.getByRole('button', { name: E.attach }));
  await screen.findByText(E.newFamilyHint);
}

test('searches a code, picks the family, confirms: the student moves', async () => {
  await open();
  await fireEvent.changeText(screen.getByLabelText(E.search), 'AB-0190');
  jest.advanceTimersByTime(400);
  await fireEvent.press(await screen.findByRole('radio', { name: 'أبو خالد' }));
  await fireEvent.press(screen.getByRole('button', { name: E.confirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/people/students/s1/guardian', {
      guardian_id: 'g2',
    }),
  );
  expect(mockApiFetch).toHaveBeenCalledWith('/people/guardians?search=AB-0190');
});

test('a new guardian by number, parsed to E.164', async () => {
  await open();
  const names = screen.getAllByLabelText(E.fields.name);
  await fireEvent.changeText(names[names.length - 1], 'أبو سهيلة');
  await fireEvent.changeText(screen.getByLabelText(E.fields.phone), '+20 100 000 0003');
  await fireEvent.press(screen.getByRole('button', { name: E.newFamily }));
  await fireEvent.press(screen.getByRole('button', { name: E.confirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/people/students/s1/guardian', {
      guardian: { name: 'أبو سهيلة', phone_e164: '+201000000003', tz: 'Africa/Cairo' },
    }),
  );
});
