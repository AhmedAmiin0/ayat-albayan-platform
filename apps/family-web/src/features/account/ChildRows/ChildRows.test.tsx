import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { home, kid } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { ChildRows } from './ChildRows';

const pick = vi.hoisted(() => vi.fn());
const shown = vi.hoisted(() => ({ pick: { state: 'none' } as object }));
vi.mock('@/features/shell', () => ({
  usePickChild: () => pick,
  useFamilyPick: () => shown.pick,
}));
vi.mock('@/features/account/use-child-teacher', () => ({ useChildTeacher: () => null }));

const rows = () => screen.findAllByRole('button', { name: /AB-020/ });

beforeEach(() => {
  pick.mockReset();
  shown.pick = { state: 'none' };
});

describe('ChildRows', () => {
  it('a heading and one row per child, by name', async () => {
    renderAt(<ChildRows home={home()} />);
    const title = { name: t.portal.app.account.children };
    expect(await screen.findByRole('heading', title)).toBeTruthy();
    const [first, second] = await rows();
    expect(first?.textContent).toContain('سلمى');
    expect(second?.textContent).toContain('يوسف');
  });

  it('no child in view: no row is current', async () => {
    renderAt(<ChildRows home={home()} />);
    const all = await rows();
    expect(all.map((row) => row.getAttribute('aria-current'))).toEqual([null, null]);
  });

  it('the child in view is the current row', async () => {
    shown.pick = { state: 'one', student: kid({ id: 's2' }) };
    renderAt(<ChildRows home={home()} />);
    const all = await rows();
    expect(all.map((row) => row.getAttribute('aria-current'))).toEqual([null, 'true']);
  });

  it('a guardian who studies is «أنا»', async () => {
    const self = kid({ id: 's3', code: 'AB-0203', name: 'أحمد', contact_is_self: true });
    renderAt(<ChildRows home={home({ students: [kid(), self] })} />);
    const all = await rows();
    expect(all.some((row) => row.textContent.includes(t.portal.app.pick.me))).toBe(true);
    expect(all.some((row) => row.textContent.includes('أحمد'))).toBe(false);
  });

  it('a tap picks that child and goes home', async () => {
    const { router } = renderAt(<ChildRows home={home()} />, '/account');
    const [, second] = await rows();
    if (second) fireEvent.click(second);
    expect(pick).toHaveBeenCalledWith('s2');
    await waitFor(() => expect(router.state.location.pathname).toBe('/portal'));
  });
});
