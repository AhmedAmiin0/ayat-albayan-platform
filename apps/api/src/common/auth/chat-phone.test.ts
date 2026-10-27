import { describe, expect, it } from 'vitest';
import { chatPhone } from './chat-phone';
import type { AuthUser } from './verify-token';

const user = (permissions: string[]) => ({ id: 'u1', email: null, role: 'sales', permissions }) as unknown as AuthUser;

describe('chatPhone: the family phone only for a holder of inbox.read', () => {
  it('a salesperson who opens chats sees it', () => {
    expect(chatPhone(user(['inbox.read']), '+966551110000')).toBe('+966551110000');
  });
  it('a role without inbox.read gets null, and so does a missing phone', () => {
    expect(chatPhone(user(['self.sales_academy']), '+966551110000')).toBeNull();
    expect(chatPhone(user(['inbox.read']), null)).toBeNull();
    expect(chatPhone(user(['inbox.read']), '')).toBeNull();
  });
});
