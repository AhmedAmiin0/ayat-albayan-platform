import { fireEvent, screen } from '@testing-library/react-native';
import { setLocale, t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { AccountSettings } from './AccountSettings';

// The language is picked in settings too, not only from the phone's.

jest.mock('@ab/mobile-kit/lib/i18n/locale-switch', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/i18n/locale-switch'),
  setLocale: jest.fn(async () => 'reloading'),
}));

test('«اللغة» offers English by its own name; one confirm, then the switch', async () => {
  await renderWithQuery(<AccountSettings student={false} />, freshQueryClient());
  expect(screen.getByRole('header', { name: t.theme.label })).toBeTruthy();
  expect(screen.getByRole('header', { name: t.language.label })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.language.en }));
  expect(screen.getByText(t.language.restart)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
  expect(setLocale).toHaveBeenCalledWith('en');
});
