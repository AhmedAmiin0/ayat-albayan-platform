import { fireEvent, screen } from '@testing-library/react-native';
import { setLocale, t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { FamilySignInScreen } from '#/sign-in/FamilySignInScreen/FamilySignInScreen.tsx';

// Signed out, the other language is one quiet tap under the sign-in (no «اللغة» section): an
// English phone that wants Arabic, or the other way round, need not sign in first.

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('@ab/mobile-kit/lib/i18n/locale-switch', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/i18n/locale-switch'),
  setLocale: jest.fn(async () => 'reloading'),
}));

const show = async () => {
  mockApiFetch.mockResolvedValue({ available: true, staff: false });
  await renderWithQuery(<FamilySignInScreen />, freshQueryClient());
  await screen.findByLabelText(t.familyAuth.phone);
};

beforeEach(() => jest.clearAllMocks());

test('the other language by its own name; one confirm, then the switch', async () => {
  await show();
  expect(screen.queryByRole('header', { name: t.language.label })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.language.en }));
  expect(screen.getByText(t.language.restart)).toBeTruthy();
  expect(setLocale).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
  expect(setLocale).toHaveBeenCalledWith('en');
});

test('إلغاء keeps the language and the sign-in as it was', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t.language.en }));
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByText(t.language.restart)).toBeNull();
  expect(setLocale).not.toHaveBeenCalled();
  expect(screen.getByLabelText(t.familyAuth.phone)).toBeTruthy();
});
