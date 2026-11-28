import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { RulesTableRepo } from './rules-table.repo';

// A notification rule can never pick the calls number (docs/28 §10): it is no number to route by.

describe('RulesTableRepo.numberExists and the calls number', () => {
  it('a calls number reads as unknown (422 unknown_number upstream); a messaging number exists', async () => {
    const { db } = fakeDb({ wa_numbers: [{ data: { id: 'n-calls', purpose: 'calls' } }, { data: { id: 'n-chat', purpose: 'chat' } }, { data: null }] });
    const table = new RulesTableRepo(db);
    expect(await table.numberExists('n-calls')).toBe(false);
    expect(await table.numberExists('n-chat')).toBe(true);
    expect(await table.numberExists('n-none')).toBe(false);
  });
});
