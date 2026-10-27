import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { t } from '@/core/lib/i18n/i18n';
import { ContactIsSelfCard } from './ContactIsSelfCard';

// «رقم الواتساب لـ: ولي الأمر / الطالب نفسه» (docs/30 §1) on the student file.

const C = t.familyAuth.contactIsSelf;
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

beforeEach(() => mockApiSend.mockReset().mockResolvedValue({}));

const checked = (name: string) => screen.getByRole('radio', { name }).props.accessibilityState?.checked;

test('an absent value shows «ولي الأمر»; tapping «الطالب نفسه» PATCHes true', async () => {
  await renderWithQuery(<ContactIsSelfCard studentId="s1" value={undefined} />);
  expect(screen.getByText(C.label)).toBeTruthy();
  expect(checked(C.guardian)).toBe(true);
  await fireEvent.press(screen.getByRole('radio', { name: C.self }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/students/s1', { contact_is_self: true }));
});

test('a self-contact student can go back to «ولي الأمر» (false is sent); the same pick sends nothing', async () => {
  await renderWithQuery(<ContactIsSelfCard studentId="s1" value />);
  expect(checked(C.self)).toBe(true);
  await fireEvent.press(screen.getByRole('radio', { name: C.self }));
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('radio', { name: C.guardian }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/students/s1', { contact_is_self: false }));
});

test('a failed save says so', async () => {
  mockApiSend.mockRejectedValue(new Error('x'));
  await renderWithQuery(<ContactIsSelfCard studentId="s1" value={false} />);
  await fireEvent.press(screen.getByRole('radio', { name: C.self }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});
