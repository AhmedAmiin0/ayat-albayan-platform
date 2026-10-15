import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { StudentKindSwitch } from './StudentKindSwitch';

const L = t.studentLists;
const COUNTS = { new: 1, trial: 4, pending_subscription: 2, active: 30, pending_renewal: 3, expired: 1, paused: 5, churned: 2 };
const TRIAL_KIND = 'new,trial,pending_subscription';

function show(status: string | undefined, counts?: typeof COUNTS) {
  const onChange = vi.fn();
  render(<StudentKindSwitch status={status} counts={counts} onChange={onChange} />);
  const group = screen.getByRole('group', { name: L.kinds });
  const seg = (label: string) => within(group).getByRole('button', { name: new RegExp(`^${label}`) });
  return { onChange, group, seg };
}

const pressed = (group: HTMLElement) =>
  within(group)
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent);

describe('StudentKindSwitch «الكل · مشترك · تجريبي» (owner 2026-10-12)', () => {
  it('no status param: «الكل» pressed; segments in order all, active, trial («تجريبي» = new + trial + pending_subscription)', () => {
    const { group } = show(undefined, COUNTS);
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual([`${L.all}48`, `${L.active}30`, `${L.trial}7`]);
    expect(pressed(group)).toEqual([`${L.all}48`]);
  });

  it('?status=active presses «مشترك»', () => {
    expect(pressed(show('active').group)).toEqual([L.active]);
  });

  it('?status=new,trial,pending_subscription presses «تجريبي», in any order', () => {
    expect(pressed(show('pending_subscription,new,trial').group)).toEqual([L.trial]);
  });

  it('another combination (trial alone / trial,active) presses none', () => {
    expect(pressed(show('trial').group)).toEqual([]);
    cleanup();
    expect(pressed(show('trial,active').group)).toEqual([]);
  });

  it('a package-ended status is never «مشترك» nor «تجريبي»: counted under «الكل» only, presses none', () => {
    const { group } = show('pending_renewal,expired', { ...COUNTS, new: 0, trial: 0, pending_subscription: 0, active: 0 });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual([`${L.all}11`, `${L.active}0`, `${L.trial}0`]);
    expect(pressed(group)).toEqual([]);
  });

  it('a click writes the status filter: the kind, or blank for «الكل»', () => {
    const { onChange, seg } = show('trial,active', COUNTS);
    fireEvent.click(seg(L.trial));
    expect(onChange).toHaveBeenLastCalledWith(TRIAL_KIND);
    fireEvent.click(seg(L.active));
    expect(onChange).toHaveBeenLastCalledWith('active');
    fireEvent.click(seg(L.all));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('no counts while loading or when an answer is not counts', () => {
    const { group } = show('paused', { trial: 1, active: 2 } as unknown as typeof COUNTS);
    expect(pressed(group)).toEqual([]);
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual([L.all, `${L.active}2`, L.trial]);
  });
});
