import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import type { Teacher } from '../types';
import { TeacherUsername } from './TeacherUsername';

// «اسم المستخدم» of the teacher's login (docs/30 §7).

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (mockMethod: string, mockPath: string, mockBody?: unknown) => mockApiSend(mockMethod, mockPath, mockBody),
}));

const U = t.familyAuth.teacherUsername;
const OMAR: Teacher = { id: 't1', display_name_ar: 'أ. عمر', phone_e164: null, status: 'active', tz: 'Africa/Cairo', profile_id: 'p1', username: 'omar' };
const input = () => screen.getByLabelText(U.label);
const save = () => fireEvent.press(screen.getByRole('button', { name: t.common.save }));

beforeEach(() => {
  mockApiSend.mockReset();
  mockApiSend.mockResolvedValue(OMAR);
});

test('shown LTR with the hint, lower-cased on blur', async () => {
  await renderWithQuery(<TeacherUsername teacher={OMAR} />);
  expect(input().props.value).toBe('omar');
  expect(input().props.autoCapitalize).toBe('none');
  expect(screen.getByText(U.hint)).toBeTruthy();
  await fireEvent.changeText(input(), ' Ustadh.Omar ');
  await fireEvent(input(), 'blur');
  expect(input().props.value).toBe('ustadh.omar');
});

test('without a login: read-only with the needs-login note and no save', async () => {
  await renderWithQuery(<TeacherUsername teacher={{ ...OMAR, profile_id: null, username: null }} />);
  expect(input().props.editable).toBe(false);
  expect(screen.getByText(U.needsLogin)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.common.save })).toBeNull();
});

test('sends the lower-cased username, and nothing when unchanged', async () => {
  await renderWithQuery(<TeacherUsername teacher={OMAR} />);
  await save();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.changeText(input(), 'Ustadh.Omar');
  await save();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/teachers/t1', { username: 'ustadh.omar' }));
});

test('sends null when cleared', async () => {
  await renderWithQuery(<TeacherUsername teacher={OMAR} />);
  await fireEvent.changeText(input(), '');
  await save();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/teachers/t1', { username: null }));
});

test('an invalid username is not sent', async () => {
  await renderWithQuery(<TeacherUsername teacher={OMAR} />);
  await fireEvent.changeText(input(), 'AB-1234');
  await save();
  expect(screen.getByText(U.invalid)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test.each([
  ['username_taken', U.taken],
  ['username_needs_login', U.needsLogin],
])('409 %s shows its text', async (code, text) => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code }));
  await renderWithQuery(<TeacherUsername teacher={OMAR} />);
  await fireEvent.changeText(input(), 'omar2');
  await save();
  expect(await screen.findByText(text)).toBeTruthy();
});

test('hidden without teachers.write', async () => {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions: ['teachers.read'] });
  await renderWithQuery(<TeacherUsername teacher={OMAR} />, client);
  expect(screen.queryByLabelText(U.label)).toBeNull();
});
