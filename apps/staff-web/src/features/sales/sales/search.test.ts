import { describe, expect, it } from 'vitest';
import { parseMoneySearch, parseSalesSubscriptionsSearch, parseStudentsSearch } from './search';

const ID = 'c1000000-0000-4000-8000-0000000000c1';

describe('parseSalesSubscriptionsSearch', () => {
  it('keeps only «مؤكدة»; pending (the default) and anything else stay out of the URL', () => {
    expect(parseSalesSubscriptionsSearch({ kind: 'confirmed' })).toEqual({ kind: 'confirmed' });
    expect(parseSalesSubscriptionsSearch({ kind: 'pending' })).toEqual({});
    expect(parseSalesSubscriptionsSearch({ kind: 'all' })).toEqual({});
  });

  it('keeps a history id on «مؤكدة» only, and only a uuid', () => {
    expect(parseSalesSubscriptionsSearch({ kind: 'confirmed', history: ID })).toEqual({ kind: 'confirmed', history: ID });
    expect(parseSalesSubscriptionsSearch({ kind: 'confirmed', history: 'x' })).toEqual({ kind: 'confirmed' });
    expect(parseSalesSubscriptionsSearch({ history: ID })).toEqual({});
  });
});

describe('the view filters of «الطلاب» and «محفظتي»', () => {
  it('keep only the non-default view in the URL', () => {
    expect(parseStudentsSearch({ view: 'mine' })).toEqual({ view: 'mine' });
    expect(parseStudentsSearch({ view: 'all' })).toEqual({});
    expect(parseStudentsSearch({})).toEqual({});
  });

  it('?chat= opens a student\'s chat (a uuid only, beside the view)', () => {
    const id = '0b6f3c1e-8a4d-4c2b-9e7f-1a2b3c4d5e6f';
    expect(parseStudentsSearch({ chat: id })).toEqual({ chat: id });
    expect(parseStudentsSearch({ view: 'mine', chat: id })).toEqual({ view: 'mine', chat: id });
    expect(parseStudentsSearch({ chat: 'x' })).toEqual({});
    expect(parseStudentsSearch({ chat: 5 })).toEqual({});
    expect(parseMoneySearch({ view: 'payments' })).toEqual({ view: 'payments' });
    expect(parseMoneySearch({ view: 'statements' })).toEqual({ view: 'statements' });
    expect(parseMoneySearch({ view: 'earnings' })).toEqual({});
    expect(parseMoneySearch({ view: 'mine' })).toEqual({});
  });
});
