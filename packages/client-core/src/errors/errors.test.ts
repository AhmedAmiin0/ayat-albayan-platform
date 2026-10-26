import { describe, expect, it } from 'vitest';
import { ApiError } from '../http/index.js';
import { chatListErrorWords, type ChatListErrorText } from './chat-list-errors.js';

const words: ChatListErrorText = { limit: 'limit', nameTaken: 'taken', notFound: 'gone', saveError: 'failed' };
const listErrorText = chatListErrorWords(() => words);

describe('chatListErrorWords (docs/22 §3)', () => {
  it('the 409 codes: the name is taken, the 30-list limit', () => {
    expect(listErrorText(new ApiError(409, { code: 'list_name_taken' }))).toBe('taken');
    expect(listErrorText(new ApiError(409, { code: 'list_limit' }))).toBe('limit');
  });

  it('a list deleted meanwhile (404) says so', () => {
    expect(listErrorText(new ApiError(404, { message: 'Not Found' }))).toBe('gone');
  });

  it('anything else is the generic save error', () => {
    expect(listErrorText(new ApiError(500))).toBe('failed');
    expect(listErrorText(new ApiError(409, 'conflict'))).toBe('failed');
    expect(listErrorText(new ApiError(409, { code: 'other' }))).toBe('failed');
    expect(listErrorText(new Error('offline'))).toBe('failed');
    expect(listErrorText(null)).toBe('failed');
  });

  it('reads the words on every call', () => {
    let text = words;
    const read = chatListErrorWords(() => text);
    text = { ...words, saveError: 'changed' };
    expect(read(new Error('x'))).toBe('changed');
  });
});
