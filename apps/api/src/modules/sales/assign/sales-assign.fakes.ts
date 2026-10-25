// In-memory leads + salespeople behind SalesAssignQueries (test-only, excluded from the build by *.fakes.ts).
import type { Tables } from '@ab/db';
import { vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import { readerOf } from '../../../common/settings/settings.fakes';
import type { SalesAssignQueries } from './sales-assign.queries';
import { SalesAssignService } from './sales-assign.service';
import { SalesSettings } from '../sales.settings';

export const SALES = [{ id: 'a', full_name: 'أحمد' }, { id: 'b', full_name: 'بلال' }];

export function world(over: { sales?: typeof SALES; on?: boolean; leads?: Tables<'leads'>[] } = {}) {
  const leads = new Map((over.leads ?? []).map((l) => [l.id, l]));
  const q = {
    salespeople: vi.fn(async () => over.sales ?? SALES),
    assignedLeads: vi.fn(async (ids: string[]) => [...leads.values()].filter((l) => l.assigned_to && ids.includes(l.assigned_to))),
    unassignedLeadIds: vi.fn(async () => [...leads.values()].filter((l) => !l.assigned_to).map((l) => l.id)),
    isSalesperson: vi.fn(async (id: string) => (over.sales ?? SALES).some((s) => s.id === id)),
    names: vi.fn(async () => new Map<string, string>()),
    setAssignee: vi.fn(async (i: { leadId: string; profileId: string | null; onlyIfFree?: boolean }) => {
      const row = leads.get(i.leadId);
      if (!row || (i.onlyIfFree && row.assigned_to)) return null;
      const next = { ...row, assigned_to: i.profileId, updated_at: new Date().toISOString() };
      leads.set(i.leadId, next);
      return next;
    }),
  };
  const settings = readerOf(SalesSettings, { sales_auto_assign: over.on ?? true });
  const audit = { record: vi.fn() };
  const service = new SalesAssignService(q as unknown as SalesAssignQueries, settings, audit as unknown as AuditService);
  return { service, q, settings, audit, leads };
}

