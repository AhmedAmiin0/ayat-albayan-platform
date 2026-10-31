import { describe, expect, it } from 'vitest';
import { canHideMessages, canUnhideMessages } from './hidden.js';

describe('«حذف من المنصة» roles', () => {
  it('admin and sales with inbox.send hide; a teacher or a role without inbox.send never', () => {
    expect(canHideMessages({ role: 'admin', permissions: ['inbox.send'] })).toBe(true);
    expect(canHideMessages({ role: 'sales', permissions: ['inbox.read', 'inbox.send'] })).toBe(
      true,
    );
    expect(canHideMessages({ role: 'teacher', permissions: ['inbox.send'] })).toBe(false);
    expect(canHideMessages({ role: 'assistant', permissions: [] })).toBe(false);
    expect(canHideMessages(null)).toBe(false);
  });

  it('only the admin shows a hidden message again', () => {
    expect(canUnhideMessages({ role: 'admin' })).toBe(true);
    expect(canUnhideMessages({ role: 'sales', permissions: ['inbox.send'] })).toBe(false);
    expect(canUnhideMessages(undefined)).toBe(false);
  });
});
