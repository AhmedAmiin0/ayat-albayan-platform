import { describe, expect, it, vi } from 'vitest';
import type { RulesReader } from '../notification-rules/rules.reader';
import { NumberRoutes } from './number-routes';
import { N2, overlayNum, THREE } from './number-route.fakes';
import type { RouteQueries } from './route.queries';
import { templateRow } from './whatsapp.fakes';

// One module-mode pass's routing input (docs/23c); a failed rules read fails the pass (nothing sends).

const queries = () => ({ approvals: vi.fn(async () => new Map()), templates: vi.fn(async () => [templateRow()]) });
const reader = (snapshot: RulesReader['snapshot']) => ({ snapshot }) as unknown as RulesReader;
const row = (number_id: string | null) => ({ key: 'booking_confirmation', enabled: true, channels: null, timing: null, number_id, updated_at: '', updated_by: null });

describe('NumberRoutes.pass', () => {
  it('the rule rows\' numbers, the numbers as routable and the templates', async () => {
    const snap = { mode: 'module' as const, rows: new Map([['booking_confirmation', row(N2)]]), settings: {} as never };
    const routes = new NumberRoutes(queries() as unknown as RouteQueries, reader(vi.fn(async () => snap)));
    const { pass, templates } = await routes.pass(THREE);
    expect(pass.ruleNumbers.get('booking_confirmation_plain')).toBe(N2);
    expect(pass.numbers.map((n) => n.sendable)).toEqual([true, true, true]);
    expect(templates).toEqual([templateRow()]);
  });

  it('rules unreadable → the pass throws (never a number the rule did not pick); no reader → no rule numbers', async () => {
    const failing = new NumberRoutes(queries() as unknown as RouteQueries, reader(vi.fn(async () => Promise.reject(new Error('db down')))));
    await expect(failing.pass(THREE)).rejects.toThrow('db down');
    expect((await new NumberRoutes(queries() as unknown as RouteQueries).pass(THREE)).pass.ruleNumbers.size).toBe(0);
  });

  it('names the crm numbers (their approval is the hand-set template status, docs/19)', async () => {
    const crm = overlayNum({ id: N2, env: { provider: 'crm', base: 'http://127.0.0.1:4010/crm/api/v1', apiKey: 'fake-crm-key' } });
    const { pass } = await new NumberRoutes(queries() as unknown as RouteQueries).pass([THREE[0], crm].filter((n) => n !== undefined));
    expect([...(pass.crm ?? [])]).toEqual([N2]);
  });

  it('approvals unreadable → the pass throws (nothing sends)', async () => {
    const q = queries();
    q.approvals.mockRejectedValueOnce(new Error('down'));
    await expect(new NumberRoutes(q as unknown as RouteQueries).pass(THREE)).rejects.toThrow('down');
  });
});
