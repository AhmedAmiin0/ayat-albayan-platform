import { describe, expect, it } from 'vitest';
import type { LineNumbers } from '../../env';
import { acceptsNumber, lineFor } from './webhook.lines';

const NOTIF = 'notif-phone';
const CHAT = 'chat-phone';
const TWO: LineNumbers = { notifications: NOTIF, chat: CHAT };
const ONE: LineNumbers = { notifications: NOTIF };
const CHAT_ONLY: LineNumbers = { chat: CHAT };

describe('acceptsNumber', () => {
  it.each([
    ['the notifications id', TWO, NOTIF, true],
    ['the chat id', TWO, CHAT, true],
    ['an unknown id', TWO, 'other', false],
    ['a missing id', TWO, undefined, true],
    ['an empty id', TWO, '', true],
    ['any id when nothing is configured', {}, 'other', true],
    ['the notifications id, single line', ONE, NOTIF, true],
    ['an unknown id, single line', ONE, CHAT, false],
    ['the chat id, chat only', CHAT_ONLY, CHAT, true],
    ['an unknown id, chat only', CHAT_ONLY, NOTIF, false],
  ] as const)('%s → %s', (...[, numbers, id, expected]) => {
    expect(acceptsNumber(numbers, id)).toBe(expected);
  });
});

describe('lineFor', () => {
  it.each([
    ['the notifications id', TWO, NOTIF, 'notifications'],
    ['the chat id', TWO, CHAT, 'chat'],
    ['an unknown id', TWO, 'other', null],
    ['a missing id', TWO, undefined, null],
    ['an empty config', {}, NOTIF, null],
    ['chat unset, even for the notifications id', ONE, NOTIF, null],
    ['chat unset, an unknown id', ONE, 'other', null],
    ['chat only, the chat id', CHAT_ONLY, CHAT, 'chat'],
  ] as const)('%s → %s', (...[, numbers, id, expected]) => {
    expect(lineFor(numbers, id)).toBe(expected);
  });
});
