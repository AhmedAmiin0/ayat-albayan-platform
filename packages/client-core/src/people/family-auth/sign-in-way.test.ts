import { expect, test } from 'vitest';
import { firstWay, OTHER_WAY, WAY_DIRECTION } from './sign-in-way';

test('codes on: WhatsApp first; codes off: the password form', () => {
  expect(firstWay(true)).toBe('whatsapp');
  expect(firstWay(false)).toBe('password');
});

test('the switch goes to the other way, forward to the password and back to WhatsApp', () => {
  expect(OTHER_WAY.whatsapp).toBe('password');
  expect(OTHER_WAY.password).toBe('whatsapp');
  expect(WAY_DIRECTION[OTHER_WAY.whatsapp]).toBe('forward');
  expect(WAY_DIRECTION[OTHER_WAY.password]).toBe('back');
});
