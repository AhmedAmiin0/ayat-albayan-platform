import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { setLocale } from '@/lib/locale-switch';
import { LanguageRow } from './LanguageRow';

jest.mock('@/lib/locale-switch', () => ({ setLocale: jest.fn(async () => undefined) }));

beforeEach(() => jest.clearAllMocks());

test('«اللغة» offers English by its own name; asks first (restart), then switches', async () => {
  await render(<LanguageRow />);
  expect(screen.getByRole('header', { name: t.language.label })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.language.ar })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'English' }));
  expect(screen.getByText(t.language.restart)).toBeTruthy();
  expect(setLocale).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
  expect(setLocale).toHaveBeenCalledWith('en');
});

test('إلغاء keeps the language', async () => {
  await render(<LanguageRow />);
  await fireEvent.press(screen.getByRole('button', { name: 'English' }));
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByText(t.language.restart)).toBeNull();
  expect(setLocale).not.toHaveBeenCalled();
});
