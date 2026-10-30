import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { RulesTable } from './rules.table';

// A notification rule can never pick the calls number (docs/28 §10): it is no number to route by.

describe('RulesTable.numberExists and the calls number', () => {
  it('a calls number reads as unknown (422 unknown_number upstream); a messaging number exists', async () => {
    const { db } = fakeDb({ wa_numbers: [{ data: { id: 'n-calls', purpose: 'calls' } }, { data: { id: 'n-chat', purpose: 'chat' } }, { data: null }] });
    const table = new RulesTable(db);
    expect(await table.numberExists('n-calls')).toBe(false);
    expect(await table.numberExists('n-chat')).toBe(true);
    expect(await table.numberExists('n-none')).toBe(false);
  });
});
