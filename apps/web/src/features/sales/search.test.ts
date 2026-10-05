import { describe, expect, it } from 'vitest';
import { parseSalesSubscriptionsSearch } from './search';

describe('parseSalesSubscriptionsSearch', () => {
  it('keeps only «مؤكدة»; pending (the default) and anything else stay out of the URL', () => {
    expect(parseSalesSubscriptionsSearch({ kind: 'confirmed' })).toEqual({ kind: 'confirmed' });
    expect(parseSalesSubscriptionsSearch({ kind: 'pending' })).toEqual({});
    expect(parseSalesSubscriptionsSearch({ kind: 'all' })).toEqual({});
  });
});
