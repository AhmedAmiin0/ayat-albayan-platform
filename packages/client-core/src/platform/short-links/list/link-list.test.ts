import { describe, expect, it } from 'vitest';
import {
  isListFiltered, listFilterOf, ownerChoices, ownerIdOf, LINK_STATUS_TABS, linkStatusOf,
} from './link-list';

const OWNER = '33333333-3333-4333-8333-333333333333';

describe('status chips', () => {
  it('lists «الكل» then each server status', () => {
    expect(LINK_STATUS_TABS).toEqual(['all', 'active', 'expired', 'revoked']);
    expect(linkStatusOf('all')).toEqual({});
    expect(linkStatusOf('expired')).toEqual({ status: 'expired' });
  });
});

describe('listFilterOf', () => {
  it('keeps only what is set, the search trimmed', () => {
    expect(listFilterOf({})).toEqual({});
    expect(listFilterOf({ tab: 'all', owner: undefined, search: '   ' })).toEqual({});
    expect(listFilterOf({ tab: 'revoked', owner: OWNER, search: '  لقاء ' })).toEqual({
      status: 'revoked',
      owner: OWNER,
      search: 'لقاء',
    });
  });
});

describe('isListFiltered', () => {
  it('ignores «الكل» and a blank search', () => {
    expect(isListFiltered({ tab: 'all', search: ' ' })).toBe(false);
    expect(isListFiltered({ tab: 'active' })).toBe(true);
    expect(isListFiltered({ owner: OWNER })).toBe(true);
    expect(isListFiltered({ search: 'x' })).toBe(true);
  });
});

describe('owners', () => {
  it('maps a chip to the owner it filters on', () => {
    expect(ownerIdOf('all', 'me-id')).toBeUndefined();
    expect(ownerIdOf('mine', 'me-id')).toBe('me-id');
    expect(ownerIdOf('mine', '')).toBeUndefined();
    expect(ownerIdOf(OWNER, 'me-id')).toBe(OWNER);
  });

  it('offers each owner on the rows once, in their order', () => {
    const a = { id: 'a', name: 'أحمد', role: 'admin' };
    const b = { id: 'b', name: 'الزهراء', role: 'sales' };
    const rows = [{ createdBy: a }, { createdBy: null }, { createdBy: b }, { createdBy: a }];
    expect(ownerChoices(rows)).toEqual([
      { id: 'a', name: 'أحمد' },
      { id: 'b', name: 'الزهراء' },
    ]);
  });
});
