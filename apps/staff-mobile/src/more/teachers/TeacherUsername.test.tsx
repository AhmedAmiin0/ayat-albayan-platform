import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t, pathKey } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { TeacherUsername } from './TeacherUsername';
import type { Teacher } from '@ab/shared';
import { teacherFixture } from '@ab/shared/testing';
import { mockCall } from '@ab/testing/mock-call';

// docs/30 §7.

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const U = t.familyAuth.teacherUsername;
const OMAR: Teacher = teacherFixture({
  id: 't1',
  display_name_ar: 'أ. عمر',
  phone_e164: null,
  status: 'active',
  tz: 'Africa/Cairo',
  profile_id: 'p1',
  username: 'omar',
});
const input = () => screen.getByLabelText(U.label);
const save = () => fireEvent.press(screen.getByRole('button', { name: t.common.save }));

beforeEach(() => {
  mockApi.reset('write');
  mockApi.onWrite(() => OMAR);
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
  await renderWithQuery(
    <TeacherUsername teacher={{ ...OMAR, profile_id: null, username: null }} />,
  );
  expect(input().props.editable).toBe(false);
  expect(screen.getByText(U.needsLogin)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.common.save })).toBeNull();
});

test('sends the lower-cased username, and nothing when unchanged', async () => {
  await renderWithQuery(<TeacherUsername teacher={OMAR} />);
  await save();
  expect(mockApi.writes()).toHaveLength(0);
  await fireEvent.changeText(input(), 'Ustadh.Omar');
  await save();
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({
      method: 'PATCH',
      path: '/teachers/t1',
      body: { username: 'ustadh.omar' },
    }),
  );
});

test('sends null when cleared', async () => {
  await renderWithQuery(<TeacherUsername teacher={OMAR} />);
  await fireEvent.changeText(input(), '');
  await save();
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({
      method: 'PATCH',
      path: '/teachers/t1',
      body: { username: null },
    }),
  );
});

test('an invalid username is not sent', async () => {
  await renderWithQuery(<TeacherUsername teacher={OMAR} />);
  await fireEvent.changeText(input(), 'AB-1234');
  await save();
  expect(screen.getByText(U.invalid)).toBeTruthy();
  expect(mockApi.writes()).toHaveLength(0);
});

test.each([
  ['username_taken', U.taken],
  ['username_needs_login', U.needsLogin],
])('409 %s shows its text', async (code, text) => {
  mockApi.onWrite(() => Promise.reject(new ApiError(409, { code })));
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
