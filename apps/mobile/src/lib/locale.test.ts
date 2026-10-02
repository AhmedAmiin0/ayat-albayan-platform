import ar from '@ab/shared/i18n/ar.json';
import { I18nManager } from 'react-native';
import { t } from './i18n';
import { bootLocale, locale } from './locale';

afterEach(() => jest.restoreAllMocks());

test('an RTL run is Arabic, the default: t is ar.json', () => {
  expect(bootLocale()).toBe('ar');
  expect(locale).toBe('ar');
  expect(t).toBe(ar);
});

test('an LTR run (English chosen) boots in English', () => {
  jest.replaceProperty(I18nManager, 'isRTL', false);
  expect(bootLocale()).toBe('en');
});
