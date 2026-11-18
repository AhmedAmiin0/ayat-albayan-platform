import { describe, expect, it } from 'vitest';
import { editOf, toUpdateBody } from './link-edit.js';

const clock = { now: new Date('2026-11-17T11:06:00.000Z'), tz: 'Asia/Riyadh' };

describe('editOf', () => {
  it('starts from the link, keeping its expiry', () => {
    expect(editOf({ title: 'لقاء', maxUsers: 5 })).toEqual({ title: 'لقاء', maxUsers: '5', expiry: null });
    expect(editOf({ title: 'لقاء', maxUsers: null }).maxUsers).toBe('');
  });
});

describe('toUpdateBody', () => {
  it('sends the title and the limit, and no expiry while it is kept', () => {
    expect(toUpdateBody({ title: ' لقاء ', maxUsers: '', expiry: null }, clock)).toEqual({
      body: { title: 'لقاء', maxUsers: null },
    });
  });

  it('moves the expiry from now', () => {
    const edit = { title: 'لقاء', maxUsers: '١٢', expiry: { kind: 'days', days: 3 } } as const;
    expect(toUpdateBody(edit, clock)).toEqual({
      body: { title: 'لقاء', maxUsers: 12, expiresAt: '2026-11-20T11:06:00.000Z' },
    });
  });

  it('names each bad field', () => {
    const past = { kind: 'date', at: '2026-11-01T00:00:00.000Z' } as const;
    expect(toUpdateBody({ title: ' ', maxUsers: 'x', expiry: past }, clock)).toEqual({
      errors: { title: 'title_invalid', maxUsers: 'max_users_invalid', expiresAt: 'expiry_past' },
    });
  });
});
