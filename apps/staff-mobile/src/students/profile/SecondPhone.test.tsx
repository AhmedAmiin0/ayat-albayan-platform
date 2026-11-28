import { formatPhone } from '@ab/core';
import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError, t, pathKey, ltr } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { GuardianCard } from './GuardianCard';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const MAIN = '+966552147730';
const SECOND = '+966552220000';
const guardian = {
  id: 'g1',
  name: 'أم يوسف',
  phone_e164: MAIN,
  phones: [
    { phone_e164: MAIN, is_primary: true },
    { phone_e164: SECOND, is_primary: false },
  ],
};

async function askToRemove() {
  const result = await renderWithQuery(<GuardianCard guardian={guardian} />);
  await fireEvent.press(screen.getByRole('button', { name: t.guardians.removePhone }));
  expect(
    screen.getByText(t.guardians.removePhoneConfirm.replace('{phone}', ltr(formatPhone(SECOND)))),
  ).toBeTruthy();
  return result;
}

beforeEach(() => mockApi.reset('write'));
afterEach(() => jest.restoreAllMocks());

test('two numbers, each labelled; «اتصال» and «واتساب» stay on the main number', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderWithQuery(<GuardianCard guardian={guardian} />);
  expect(screen.getByText(t.guardians.mainPhone)).toBeTruthy();
  expect(screen.getByText(t.guardians.secondPhone)).toBeTruthy();
  expect(screen.getByText(ltr(formatPhone(SECOND)))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.call }));
  expect(open).toHaveBeenCalledWith(`tel:${MAIN}`);
});

test('«إزالة الرقم الثاني» asks, then DELETEs the encoded number and refreshes the file and the chats', async () => {
  mockApi.onWrite(() => undefined);
  const { client } = await askToRemove();
  const refresh = jest.spyOn(client, 'invalidateQueries');
  await fireEvent.press(screen.getByRole('button', { name: t.guardians.removePhone }));
  // Announced: the button the reader was on is gone.
  expect(await screen.findByRole('alert')).toHaveTextContent(t.guardians.phoneRemoved);
  expect(mockApi.writes()).toContainEqual({
    method: 'DELETE',
    path: '/guardians/g1/phones/%2B966552220000',
    body: undefined,
  });
  const keys = refresh.mock.calls.map((c) => c[0]?.queryKey);
  expect(keys).toEqual(expect.arrayContaining([['students'], ['threads']]));
});

test('«إلغاء» keeps the number; a 404 says it is no longer this family’s second number', async () => {
  mockApi.onWrite(() => Promise.reject(new ApiError(404, { code: 'phone_not_found' })));
  await askToRemove();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(mockApi.writes()).toHaveLength(0);
  await fireEvent.press(screen.getByRole('button', { name: t.guardians.removePhone }));
  await fireEvent.press(screen.getByRole('button', { name: t.guardians.removePhone }));
  expect(await screen.findByText(t.guardians.phoneNotFound)).toBeTruthy();
  expect(screen.getByText(ltr(formatPhone(SECOND)))).toBeTruthy();
});

test('without guardians.write: the second number, no remove; a family with one number shows no labels', async () => {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions: ['students.read'] });
  await renderWithQuery(<GuardianCard guardian={guardian} />, client);
  expect(screen.getByText(ltr(formatPhone(SECOND)))).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.guardians.removePhone })).toBeNull();
  screen.unmount();
  await renderWithQuery(
    <GuardianCard guardian={{ ...guardian, phones: [{ phone_e164: MAIN, is_primary: true }] }} />,
  );
  expect(screen.queryByText(t.guardians.mainPhone)).toBeNull();
  expect(screen.queryByText(t.guardians.secondPhone)).toBeNull();
});
