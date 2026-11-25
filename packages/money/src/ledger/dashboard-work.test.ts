import { describe, expect, it } from 'vitest';
import { WORK_TABS, type DashboardWork, type WorkTab } from './dashboard-work';

describe('dashboard work contract', () => {
  it('lists the work tabs in screen order', () => {
    expect(WORK_TABS).toEqual(['reports', 'unpaid', 'tasks']);
  });

  it('keys one work list per tab', () => {
    const lists: Record<WorkTab, keyof DashboardWork> = {
      reports: 'pending_reports',
      unpaid: 'unpaid',
      tasks: 'tasks',
    };
    expect(Object.keys(lists)).toEqual([...WORK_TABS]);
  });
});
