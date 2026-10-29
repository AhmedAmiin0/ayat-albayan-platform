import { formatPhone } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { ltr } from '@/core/ui/primitives/Ltr';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { GuardianCard } from './GuardianCard';

// The family's numbers on the admin student file (owner 2026-10-29, «ربط بطالب موجود»).
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
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
  expect(screen.getByText(t.guardians.removePhoneConfirm.replace('{phone}', ltr(formatPhone(SECOND))))).toBeTruthy();
  return result;
}

beforeEach(() => mockApiSend.mockReset());
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
  mockApiSend.mockResolvedValue(undefined);
  const { client } = await askToRemove();
  const refresh = jest.spyOn(client, 'invalidateQueries');
  await fireEvent.press(screen.getByRole('button', { name: t.guardians.removePhone }));
  expect(await screen.findByText(t.guardians.phoneRemoved)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('DELETE', '/guardians/g1/phones/%2B966552220000');
  const keys = refresh.mock.calls.map((c) => c[0]?.queryKey);
  expect(keys).toEqual(expect.arrayContaining([['students'], ['threads']]));
});

test('«إلغاء» keeps the number; a 404 says it is no longer this family’s second number', async () => {
  mockApiSend.mockRejectedValue(new ApiError(404, { code: 'phone_not_found' }));
  await askToRemove();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(mockApiSend).not.toHaveBeenCalled();
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
  await renderWithQuery(<GuardianCard guardian={{ ...guardian, phones: [{ phone_e164: MAIN, is_primary: true }] }} />);
  expect(screen.queryByText(t.guardians.mainPhone)).toBeNull();
  expect(screen.queryByText(t.guardians.secondPhone)).toBeNull();
});
