import { meNotificationRoutes } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { NotificationItem } from './NotificationItem';
import { ITEM, READ_ITEM, renderWithClient, STUDENT_ID } from './notifications-test-kit';

const read = vi.hoisted(() => vi.fn());
const write = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const role = vi.hoisted(() => ({ current: 'admin' }));
const me = vi.hoisted(() => () => ({ role: role.current }));
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (sent: { route: { method: string } }) =>
    sent.route.method === 'GET' ? read(sent) : write(sent),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));
vi.mock('@ab/web-kit/auth/me/me', async () => {
  const { pathKey } = await import('@ab/client-core');
  return {
    meQuery: { queryKey: pathKey('/auth/me'), queryFn: me, initialData: me, staleTime: Infinity },
  };
});

const row = (item = ITEM, onPick = vi.fn()) =>
  renderWithClient(
    <ul>
      <NotificationItem item={item} onPick={onPick} now={new Date()} />
    </ul>,
  );

beforeEach(() => {
  write.mockReset();
  write.mockResolvedValue(undefined);
  navigate.mockReset();
  role.current = 'admin';
});

describe('NotificationItem', () => {
  it('shows title, body and time; an unread row says so to screen readers', () => {
    row();
    const button = screen.getByRole('button');
    expect(button.textContent).toContain(`${t.bell.unread}: ${ITEM.title}`);
    expect(screen.getByText(ITEM.body).getAttribute('dir')).toBe('auto');
    // A Latin name or message keeps its own direction: title and body are isolated.
    expect(screen.getByText(ITEM.title).closest('bdi')?.getAttribute('dir')).toBe('auto');
    expect(button.querySelector('time')?.getAttribute('dateTime')).toBe(ITEM.created_at);
  });

  it('click marks that row read, opens the mapped path for the role, and closes the panel', async () => {
    const onPick = vi.fn();
    row(ITEM, onPick);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(write).toHaveBeenCalledWith({
        route: meNotificationRoutes.read,
        body: { ids: [ITEM.id] },
      }),
    );
    expect(navigate).toHaveBeenCalledWith({ href: `/admin/students/${STUDENT_ID}` });
    expect(onPick).toHaveBeenCalled();
  });

  it('the kind decides the path (inbox ?phone= for a teacher); a read row posts nothing', () => {
    role.current = 'teacher';
    const msg = { ...READ_ITEM, kind: 'new_message' as const, data: { phone: '+966500000001' } };
    row(msg);
    fireEvent.click(screen.getByRole('button'));
    expect(navigate).toHaveBeenCalledWith({ href: '/teacher/inbox?phone=%2B966500000001' });
    expect(write).not.toHaveBeenCalled();
    expect(screen.getByRole('button').textContent).not.toContain(t.bell.unread);
  });
});
