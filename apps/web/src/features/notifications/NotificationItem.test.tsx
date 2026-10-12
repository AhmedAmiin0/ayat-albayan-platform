import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { NotificationItem } from './NotificationItem';
import { ITEM, READ_ITEM, renderWithClient, STUDENT_ID } from './notifications-test-kit';

const apiSend = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const role = vi.hoisted(() => ({ current: 'admin' }));
const me = vi.hoisted(() => () => ({ role: role.current }));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));
vi.mock('@/features/auth/me', () => ({ meQuery: { queryKey: ['auth', 'me'], queryFn: me, initialData: me, staleTime: Infinity } }));

const row = (item = ITEM, onPick = vi.fn()) =>
  renderWithClient(
    <ul>
      <NotificationItem item={item} onPick={onPick} />
    </ul>,
  );

beforeEach(() => {
  apiSend.mockReset();
  apiSend.mockResolvedValue(undefined);
  navigate.mockReset();
  role.current = 'admin';
});

describe('NotificationItem', () => {
  it('shows title, body and time; an unread row says so to screen readers', () => {
    row();
    const button = screen.getByRole('button');
    expect(button.textContent).toContain(`${t.bell.unread}: ${ITEM.title}`);
    expect(screen.getByText(ITEM.body)).toBeTruthy();
    expect(button.querySelector('time')?.getAttribute('dateTime')).toBe(ITEM.created_at);
  });

  it('click marks that row read, opens the mapped path for the role, and closes the panel', async () => {
    const onPick = vi.fn();
    row(ITEM, onPick);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/me/notifications/read', { ids: [ITEM.id] }));
    expect(navigate).toHaveBeenCalledWith({ href: `/admin/students/${STUDENT_ID}` });
    expect(onPick).toHaveBeenCalled();
  });

  it('the kind decides the path (inbox ?phone= for a teacher); a read row posts nothing', () => {
    role.current = 'teacher';
    const msg = { ...READ_ITEM, kind: 'new_message' as const, data: { phone: '+966500000001' } };
    row(msg);
    fireEvent.click(screen.getByRole('button'));
    expect(navigate).toHaveBeenCalledWith({ href: '/teacher/inbox?phone=%2B966500000001' });
    expect(apiSend).not.toHaveBeenCalled();
    expect(screen.getByRole('button').textContent).not.toContain(t.bell.unread);
  });
});
