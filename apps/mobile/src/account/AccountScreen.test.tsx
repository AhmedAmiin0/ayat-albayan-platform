import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { apiFetch, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { profileFixture, savedProfile } from '@/test/account';
import { renderWithQuery } from '@/test/query';
import { AccountScreen } from './AccountScreen';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: jest.fn(), apiSend: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn(() => false), replace: jest.fn() } }));

const fetchMock = jest.mocked(apiFetch);
const send = jest.mocked(apiSend);
const saveIn = (title: string) => screen.getByRole('button', { name: `${t.account.save} — ${title}` });

beforeEach(() => jest.clearAllMocks());

test('R-ACC-01: Arabic title, role, admin hint, current email (LTR) and the five sections', async () => {
  fetchMock.mockResolvedValue({ ...profileFixture, role: { ...profileFixture.role, name_ar: 'مدير' } });
  await renderWithQuery(<AccountScreen home="/more" />);
  expect(screen.getByRole('header', { name: 'حسابي' })).toBeTruthy();
  expect(await screen.findByText(t.account.role.replace('{role}', 'مدير'))).toBeTruthy();
  expect(screen.getByText(t.account.adminManagedHint)).toBeTruthy();
  expect(screen.getByText(t.account.email.current.replace('{email}', '⁦huda@example.com⁩'))).toBeTruthy();
  for (const title of [t.account.avatar.title, t.account.name.title, t.account.phone.title, t.account.email.title, t.account.password.title]) {
    expect(screen.getByRole('header', { name: title })).toBeTruthy();
  }
  expect(fetchMock).toHaveBeenCalledWith('/me/profile');
  expect(screen.getByDisplayValue('+966501234567')).toBeTruthy();
});

test('load error: the message and a retry that refetches', async () => {
  fetchMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(profileFixture);
  await renderWithQuery(<AccountScreen home="/teacher/more" />);
  expect(await screen.findByText(t.account.loadError)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByDisplayValue(profileFixture.full_name)).toBeTruthy();
});

test('«رجوع» on a cold deep link goes to the More it belongs to', async () => {
  fetchMock.mockResolvedValue(profileFixture);
  await renderWithQuery(<AccountScreen home="/teacher/more" />);
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(router.replace).toHaveBeenCalledWith('/teacher/more');
});

test('R-ACC-02 name: off while unchanged, PATCH the trimmed name, success note, busy while pending', async () => {
  fetchMock.mockResolvedValue(profileFixture);
  let land: (v: unknown) => void = () => undefined;
  send.mockImplementation(() => new Promise((resolve) => (land = resolve)));
  await renderWithQuery(<AccountScreen home="/more" />);
  const input = await screen.findByLabelText(t.account.name.label);
  expect(saveIn(t.account.name.title)).toBeDisabled();
  await fireEvent.changeText(input, '  Huda S.  ');
  await fireEvent.press(saveIn(t.account.name.title));
  expect(send).toHaveBeenCalledWith('PATCH', '/me/profile', { full_name: 'Huda S.' });
  expect(saveIn(t.account.name.title)).toBeDisabled();
  land(savedProfile({ full_name: 'Huda S.' }));
  expect(await screen.findByText(t.account.toast.name)).toBeTruthy();
});

test('a one-letter name is refused here, nothing sent', async () => {
  fetchMock.mockResolvedValue(profileFixture);
  await renderWithQuery(<AccountScreen home="/more" />);
  await fireEvent.changeText(await screen.findByLabelText(t.account.name.label), 'H');
  await fireEvent.press(saveIn(t.account.name.title));
  expect(screen.getByText(t.account.errors.name_too_short)).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
});
