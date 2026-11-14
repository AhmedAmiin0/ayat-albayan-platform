import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { lesson } from '@/today/testing/fixtures';
import { LiveBadge } from './LiveBadge';

const row = lesson({ id: 'a', status: 'confirmed' }); // 13:00Z-13:45Z
afterEach(() => jest.useRealTimers());

test('the badge shows once the lesson started', async () => {
  fakeNow(new Date('2026-10-01T13:01:00Z'));
  await render(<LiveBadge lesson={row} />);
  expect(screen.getByText(t.live.now)).toBeTruthy();
});

test('nothing before the start (the soon state has its own line)', async () => {
  fakeNow(new Date('2026-10-01T12:50:00Z'));
  await render(<LiveBadge lesson={row} />);
  expect(screen.queryByText(t.live.now)).toBeNull();
});

test('nothing for a cancelled lesson', async () => {
  fakeNow(new Date('2026-10-01T13:10:00Z'));
  await render(<LiveBadge lesson={lesson({ id: 'b', status: 'cancelled_by_admin' })} />);
  expect(screen.queryByText(t.live.now)).toBeNull();
});
