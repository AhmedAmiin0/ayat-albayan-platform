import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { driveBackupKeys, googleKeys, translationKeys } from '@/features/platform/keys';
import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';

const staleAfter = async (keys: readonly (readonly unknown[])[], root: readonly unknown[]) => {
  const client = new QueryClient();
  keys.forEach((key) => client.setQueryData(key, 'cached'));
  await client.invalidateQueries({ queryKey: root, refetchType: 'none' });
  return keys.filter((key) => client.getQueryState(key)?.isInvalidated === true);
};

const SEARCH = { search: '', section: '', page: 1 };

describe('platform keys', () => {
  it('keeps the key shapes the platform screens already cache under', () => {
    expect(googleKeys.status()).toEqual(['google', 'status']);
    expect(googleKeys.teachers()).toEqual(['google', 'teachers']);
    expect(googleKeys.studentSearch('ali')).toEqual(['google', 'students', 'ali']);
    expect(googleKeys.items()).toEqual(['google', 'items']);
    expect(googleKeys.teacherCalendar('t1')).toEqual(['google', 'teacher-calendar', 't1']);
    expect(translationKeys.list(SEARCH)).toEqual(['translations', SEARCH]);
    expect(driveBackupKeys.backup()).toEqual(['settings', 'integrations', 'storage-backup']);
  });

  it('a student mapping refreshes every student search, and not the teachers', async () => {
    const searches = [googleKeys.studentSearch(''), googleKeys.studentSearch('ali')];
    const others = [googleKeys.teachers(), googleKeys.teacherCalendar('t1')];
    expect(await staleAfter([...searches, ...others], googleKeys.students())).toEqual(searches);
  });

  it('an override change refreshes every translations page', async () => {
    const pages = [translationKeys.list(SEARCH), translationKeys.list({ ...SEARCH, page: 2 })];
    expect(await staleAfter([...pages, googleKeys.items()], translationKeys.all)).toEqual(pages);
  });

  it('keeps the Drive backup under the integrations settings a save invalidates', async () => {
    const reads = [driveBackupKeys.backup(), googleKeys.status()];
    expect(await staleAfter(reads, CONFIG_QUERY_KEYS.integrations)).toEqual([reads[0]]);
  });
});
