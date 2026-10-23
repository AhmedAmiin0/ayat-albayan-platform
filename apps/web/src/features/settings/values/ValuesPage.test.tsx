import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { LeaveGuard } from './LeaveGuard';
import { ValuesPage } from './ValuesPage';

type BlockOpts = { shouldBlockFn: (a: { current: { pathname: string }; next: { pathname: string } }) => boolean; enableBeforeUnload: boolean };
const router = vi.hoisted(() => ({
  opts: null as BlockOpts | null,
  status: 'idle' as 'idle' | 'blocked',
  proceed: vi.fn(),
  reset: vi.fn(),
  navigate: vi.fn(),
  view: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({
  useBlocker: (opts: BlockOpts) => {
    router.opts = opts;
    return { status: router.status, proceed: router.proceed, reset: router.reset };
  },
  useSearch: () => ({ group: 'accounts' }),
  useNavigate: () => router.navigate,
}));
vi.mock('./ValuesView', () => ({
  ValuesView: (p: { search: object; onSearch: (s: object) => void }) => {
    router.view(p.search);
    return <button onClick={() => p.onSearch({ group: 'accounts', q: 'x' })}>search</button>;
  },
}));

const l = t.settingsValues.leave;

describe('ValuesPage and the leave guard', () => {
  it('passes the URL search; typing replaces the history entry', () => {
    render(<ValuesPage />);
    expect(router.view).toHaveBeenCalledWith({ group: 'accounts' });
    fireEvent.click(screen.getByRole('button', { name: 'search' }));
    expect(router.navigate).toHaveBeenCalledWith({ search: { group: 'accounts', q: 'x' }, replace: true });
  });

  it('blocks leaving the page only with unsaved rows, never a change of group or search', () => {
    render(<LeaveGuard names={['أ']} />);
    const block = router.opts?.shouldBlockFn;
    expect(router.opts?.enableBeforeUnload).toBe(true);
    expect(block?.({ current: { pathname: '/admin/settings/values' }, next: { pathname: '/admin/students' } })).toBe(true);
    expect(block?.({ current: { pathname: '/admin/settings/values' }, next: { pathname: '/admin/settings/values' } })).toBe(false);
    render(<LeaveGuard names={[]} />);
    expect(router.opts?.shouldBlockFn({ current: { pathname: 'a' }, next: { pathname: 'b' } })).toBe(false);
  });

  it('a blocked leave asks, naming the unsaved values; stay or leave', () => {
    router.status = 'blocked';
    render(<LeaveGuard names={['مدة الجدولة']} />);
    const dialog = screen.getByRole('dialog', { name: l.title });
    expect(dialog.textContent).toContain('«مدة الجدولة»');
    fireEvent.click(screen.getByRole('button', { name: l.stay }));
    expect(router.reset).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: l.leave }));
    expect(router.proceed).toHaveBeenCalled();
    router.status = 'idle';
  });
});
