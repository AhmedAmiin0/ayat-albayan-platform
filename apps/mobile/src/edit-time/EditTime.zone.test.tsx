import { setViewerPersonTz } from '@ab/client-core';
import { act, screen } from '@testing-library/react-native';
import { whenText } from '@/booking/shared/slots';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { EditTimeHeader } from './components/EditTimeHeader';
import { upcoming } from './testing/fixtures';

// The React Compiler memoises the header: its time must follow the viewer's zone store
// (useViewerTz), not a viewerTz() read that a cached render would keep. Thursday 5 Nov 2026
// 15:00 UTC is 18:00 in Riyadh (UTC+3) and 17:00 in Cairo (UTC+2, winter).
const lesson = { ...upcoming, starts_at: '2026-11-05T15:00:00.000Z', ends_at: '2026-11-05T15:45:00.000Z' };
const line = (tz: string) =>
  t.reschedule.current.replace('{when}', whenText(lesson.starts_at, 'Asia/Riyadh', { tz, cycle: '24' }));

afterEach(() => setViewerPersonTz('Asia/Riyadh'));

test('the current time moves an hour when /auth/me sets a Cairo viewer, without a remount', async () => {
  await renderWithQuery(<EditTimeHeader lesson={lesson} mode="move" tz="Asia/Riyadh" />);
  expect(screen.getByText(line('Asia/Riyadh'))).toBeTruthy();
  expect(line('Asia/Riyadh')).toMatch(/18:00/);

  await act(async () => setViewerPersonTz('Africa/Cairo'));
  expect(screen.getByText(line('Africa/Cairo'))).toBeTruthy();
  expect(line('Africa/Cairo')).toMatch(/17:00 /);
  expect(screen.queryByText(line('Asia/Riyadh'))).toBeNull();
});
