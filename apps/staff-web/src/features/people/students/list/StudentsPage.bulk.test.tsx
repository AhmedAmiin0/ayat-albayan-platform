import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { StudentsPage } from './StudentsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const held = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: held.list, can: (p: string) => held.list.includes(p) }),
}));

const row = (id: string, name: string) => ({
  id,
  code: `AB-${id}`,
  name,
  status: 'active',
  program: 'quran',
  tz: 'Asia/Riyadh',
  created_at: '2026-10-01T00:00:00Z',
  guardian_name: 'ام جود',
  guardian_phone: '+966501234567',
  teacher_name: null,
});

function renderPage() {
  const page = { items: [row('1', 'سهيلة'), row('2', 'جود')], total: 2, page: 1, pageSize: 20 };
  apiFetch.mockImplementation((path: string) => Promise.resolve(path.startsWith('/students?') ? page : []));
  const onOpen = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentsPage search="" page={1} onChange={vi.fn()} onOpen={onOpen} />
    </QueryClientProvider>,
  );
  return { onOpen };
}

describe('students list: bulk «تعيين مسؤول مبيعات» (R-ASST-01)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('an admin who may write assistant pay can tick students; the button counts them and the tick does not open the profile', async () => {
    held.list = ['assistantpay.write'];
    const { onOpen } = renderPage();
    const tick = await screen.findByRole('checkbox', { name: t.assistants.brought.pick.replace('{name}', 'سهيلة') });
    expect(screen.queryByRole('button', { name: /تعيين مسؤول مبيعات/ })).toBeNull();
    fireEvent.click(tick);
    fireEvent.click(screen.getByRole('checkbox', { name: t.assistants.brought.pick.replace('{name}', 'جود') }));
    expect(screen.getByRole('button', { name: t.assistants.brought.bulk.replace('{count}', '2') })).toBeTruthy();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('without the permission there is no checkbox column', async () => {
    held.list = [];
    renderPage();
    await screen.findByText('سهيلة');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });
});
