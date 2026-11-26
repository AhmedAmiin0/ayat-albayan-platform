import type { NotificationItem } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { AlertRow } from '@/nav/AlertRow';

const clock = { tz: 'Asia/Riyadh', cycle: '24', locale: 'ar' } as const;
const item = (over: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'n1',
  kind: 'report_sent',
  title: 'تقرير جديد',
  body: 'تقرير حلقة سارة',
  data: {},
  created_at: '2026-11-04T15:00:00Z',
  read_at: null,
  ...over,
});

test('an unread row: its title, the unread word in its name, its body; a press hands it over', async () => {
  const onPress = jest.fn();
  const unread = item();
  await render(<AlertRow item={unread} clock={clock} onPress={onPress} />);
  const row = screen.getByRole('button', { name: `تقرير جديد، ${t.bell.unread}` });
  expect(screen.getByText(/^تقرير حلقة سارة · /)).toBeTruthy();
  await fireEvent.press(row);
  expect(onPress).toHaveBeenCalledWith(unread);
});

test('a read row without a body: only its title as its name, the time alone', async () => {
  await render(
    <AlertRow
      item={item({ read_at: '2026-11-04T16:00:00Z', body: '' })}
      clock={clock}
      onPress={jest.fn()}
    />,
  );
  expect(screen.getByRole('button', { name: 'تقرير جديد' })).toBeTruthy();
  expect(screen.queryByText(/ · /)).toBeNull();
});
