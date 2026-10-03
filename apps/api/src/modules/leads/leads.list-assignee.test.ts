import { describe, expect, it, vi } from 'vitest';
import type { SalesAssignService } from '../sales/sales-assign.service';
import { lead, leadsService } from './leads.fakes';

describe('LeadsService.list: assigned_to + assigned_to_name', () => {
  it("each row carries its salesperson's id and name; an unassigned lead has null", async () => {
    const { service, leads } = leadsService();
    const names = vi.fn(async () => new Map([['p1', 'أحمد']]));
    Object.assign(service, { sales: { names } as unknown as SalesAssignService });
    leads.list.mockResolvedValue({ items: [lead({ id: 'l1', assigned_to: 'p1' }), lead({ id: 'l2' })], total: 2 });
    const page = await service.list({ page: 1, pageSize: 25 });
    expect(names).toHaveBeenCalledWith(['p1']);
    expect(page.items.map((l) => [l.assigned_to, l.assigned_to_name])).toEqual([['p1', 'أحمد'], [null, null]]);
  });
});
