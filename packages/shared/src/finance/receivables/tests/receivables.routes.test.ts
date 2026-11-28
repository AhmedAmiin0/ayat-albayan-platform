import { describe, expect, it } from 'vitest';
import { receivablesRoutes } from '../receivables.routes';

describe('receivablesRoutes', () => {
  it('keeps the path the api serves today', () => {
    const { list } = receivablesRoutes;
    expect(`${list.method} ${list.path}`).toBe('GET /receivables');
  });

  it('answers the aging view', () => {
    const empty = { rows: [], totals: [], total: 0, currency: 'SAR', fx_missing: [] };
    expect(receivablesRoutes.list.response.parse(empty)).toEqual(empty);
  });

  it.each([[{}], [{ rows: [] }], [null]])('refuses %j', (answer) => {
    expect(receivablesRoutes.list.response.safeParse(answer).success).toBe(false);
  });
});
