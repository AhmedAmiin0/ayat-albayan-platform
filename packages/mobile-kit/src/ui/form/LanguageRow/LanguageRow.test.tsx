import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { chooseLocale } from '../../../lib/i18n/profile-locale';
import { palette } from '../../../theme';
import { LanguageRow } from './LanguageRow';

jest.mock('../../../lib/i18n/profile-locale', () => ({
  chooseLocale: jest.fn(async () => 'reloading'),
}));

beforeEach(() => jest.clearAllMocks());

test('«اللغة» offers English by its own name; asks first (restart), then switches', async () => {
  await render(<LanguageRow />);
  expect(screen.getByRole('header', { name: t.language.label })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.language.ar })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'English' }));
  expect(screen.getByText(t.language.restart)).toBeTruthy();
  expect(chooseLocale).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
  expect(chooseLocale).toHaveBeenCalledWith('en');
});

test('إلغاء keeps the language', async () => {
  await render(<LanguageRow />);
  await fireEvent.press(screen.getByRole('button', { name: 'English' }));
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByText(t.language.restart)).toBeNull();
  expect(chooseLocale).not.toHaveBeenCalled();
});

test('a restart that failed says to reopen the app (the choice is saved)', async () => {
  jest.mocked(chooseLocale).mockResolvedValueOnce('restart');
  await render(<LanguageRow />);
  await fireEvent.press(screen.getByRole('button', { name: 'English' }));
  await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
  expect(await screen.findByText(t.language.restartManually)).toBeTruthy();
});

test('compact (signed out): quiet ink-2 text, an outlined confirm, then the switch', async () => {
  await render(<LanguageRow compact />);
  expect(screen.queryByRole('header', { name: t.language.label })).toBeNull();
  const label = StyleSheet.flatten(screen.getByText('English').props.style);
  expect(label).toMatchObject({ color: palette.light.ink2 });
  await fireEvent.press(screen.getByRole('button', { name: 'English' }));
  const confirm = screen.getByRole('button', { name: t.common.confirm });
  expect(StyleSheet.flatten(confirm.props.style)).toMatchObject({
    backgroundColor: palette.light.raised,
  });
  await fireEvent.press(confirm);
  expect(chooseLocale).toHaveBeenCalledWith('en');
});

test('a choice that could not be saved says so', async () => {
  jest.mocked(chooseLocale).mockResolvedValueOnce('error');
  await render(<LanguageRow compact />);
  await fireEvent.press(screen.getByRole('button', { name: 'English' }));
  await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});
