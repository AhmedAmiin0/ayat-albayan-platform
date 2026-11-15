import { NO_ASSIGNEE } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { CLEAR_LEAD_FILTERS, leadFilterChips } from './lead-filters';
import { leadSortChoices } from './lead-sort';

const people = [{ id: '11111111-1111-4111-8111-111111111111', name: 'منى' }];
const build = (search: Parameters<typeof leadFilterChips>[0]['search'], onFilter = vi.fn()) => leadFilterChips({ search, people, onFilter });

describe('leadFilterChips', () => {
  it('no chip while nothing is set (the status is the fihris, not a chip)', () => {
    expect(build({ page: 1, status: 'new' })).toEqual([]);
  });

  it('source, assignee and order each read as «label: value» and remove only themselves', () => {
    const onFilter = vi.fn();
    const chips = build({ page: 1, source: 'whatsapp_direct', assignee: people[0]?.id ?? '', sort: 'created_at', dir: 'desc' }, onFilter);
    expect(chips.map((c) => [c.id, c.label, c.value])).toEqual([
      ['source', t.leads.source, t.enums.leadSource.whatsapp_direct],
      ['assignee', t.sales.assign.label, 'منى'],
      ['sort', t.leads.sortBy, t.leads.sort.newest],
    ]);
    chips.forEach((c) => c.onRemove());
    expect(onFilter.mock.calls).toEqual([[{ source: undefined }], [{ assignee: undefined }], [{ sort: undefined, dir: undefined }]]);
  });

  it('«بدون مسؤول» for the unassigned filter; «جارٍ التحميل» while the salespeople load; never the raw id', () => {
    expect(build({ page: 1, assignee: NO_ASSIGNEE })[0]?.value).toBe(t.sales.assign.none);
    const loading = leadFilterChips({ search: { page: 1, assignee: people[0]?.id }, people: [], onFilter: vi.fn() })[0];
    expect(loading?.value).toBe(t.common.loading);
    expect(loading?.value).not.toContain(people[0]?.id ?? '?');
  });

  it('every sort the choices offer has a label, so the chip never shows the raw «created_at:desc»', () => {
    for (const { value, label } of leadSortChoices()) {
      if (!value) continue;
      const [sort, dir] = value.split(':');
      const [chip] = build({ page: 1, ...(sort ? { sort: sort as 'name' } : {}), ...(dir ? { dir: 'desc' as const } : {}) });
      expect(chip?.value, value).toBe(label);
    }
  });

  it('«مسح الكل» clears exactly the chips\' keys (the search box keeps its text)', () => {
    expect(Object.keys(CLEAR_LEAD_FILTERS).sort()).toEqual(['assignee', 'dir', 'sort', 'source']);
    expect(Object.values(CLEAR_LEAD_FILTERS).every((v) => v === undefined)).toBe(true);
  });
});
