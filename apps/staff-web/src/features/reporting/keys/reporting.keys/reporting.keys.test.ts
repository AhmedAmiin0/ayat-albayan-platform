import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { activityKeys, dashboardKeys, reportKeys } from '@/features/reporting/keys';

const staleAfter = async (keys: readonly (readonly unknown[])[], root: readonly unknown[]) => {
  const client = new QueryClient();
  keys.forEach((key) => client.setQueryData(key, 'cached'));
  await client.invalidateQueries({ queryKey: root, refetchType: 'none' });
  return keys.filter((key) => client.getQueryState(key)?.isInvalidated === true);
};

const LIST = { page: 1, sort: [], filters: {} };
const SCOPE = { entity: 'student', entityId: 's1' };

describe('reporting keys', () => {
  it('keeps the key shapes the reporting screens already cache under', () => {
    expect(dashboardKeys.summary({ from: 'a', to: 'b' })).toEqual([
      'dashboard',
      'summary',
      'a',
      'b',
    ]);
    expect(dashboardKeys.work()).toEqual(['dashboard', 'work']);
    expect(reportKeys.form('l1')).toEqual(['reports', 'form', 'l1']);
    expect(reportKeys.student('s1', 2)).toEqual(['reports', 'student', 's1', 2]);
    expect(reportKeys.pending()).toEqual(['reports', 'pending']);
    expect(reportKeys.link('tok')).toEqual(['reports', 'link', 'tok']);
    expect(activityKeys.list(LIST, SCOPE)).toEqual(['activity', LIST, SCOPE]);
    expect(activityKeys.list(LIST)).toEqual(['activity', LIST, null]);
  });

  it('marks every report read stale when a submit invalidates the reports root', async () => {
    const reads = [
      reportKeys.form('l1'),
      reportKeys.student('s1', 1),
      reportKeys.pending(),
      reportKeys.link('tok'),
    ];
    expect(await staleAfter(reads, reportKeys.all)).toEqual(reads);
  });

  it('re-reads only the student histories after a PDF retry', async () => {
    const history = [reportKeys.student('s1', 1), reportKeys.student('s2', 3)];
    const others = [reportKeys.form('l1'), reportKeys.pending()];
    expect(await staleAfter([...history, ...others], reportKeys.students)).toEqual(history);
  });

  it('refreshes the dashboard after a closed task, and never the reports or the activity', async () => {
    const board = [dashboardKeys.summary({ from: 'a', to: 'b' }), dashboardKeys.work()];
    const others = [reportKeys.pending(), activityKeys.list(LIST)];
    expect(await staleAfter([...board, ...others], dashboardKeys.all)).toEqual(board);
  });
});
