import en from '@ab/shared/i18n/en.json';
import { t } from '@ab/mobile-kit';
import { lineWord } from './line-words';
import type * as LineWords from './line-words';

test('a known line: its ar.json word', () => {
  expect(lineWord('chat')).toBe(t.enums.waLine.chat);
  expect(lineWord('notifications')).toBe(t.enums.waLine.notifications);
});

test('a line this build does not know yet shows raw', () => {
  expect(lineWord('sms')).toBe('sms');
});

test('an LTR run names the line with the en.json word', () => {
  jest.isolateModules(() => {
    jest.doMock('@ab/mobile-kit/lib/i18n/locale', () => ({ locale: 'en' }));
    const words = jest.requireActual<typeof LineWords>('./line-words');
    expect(words.lineWord('chat')).toBe(en.enums.waLine.chat);
  });
});
