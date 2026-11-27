import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { kid } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { ChildSwitch } from './ChildSwitch';

const picked = vi.hoisted(() => ({ child: null as object | null }));
vi.mock('@/features/shell/use-family-pick', () => ({ usePickedChild: () => picked.child }));

beforeEach(() => {
  picked.child = null;
});

describe('ChildSwitch', () => {
  it('no child to switch from (a student, one child): nothing', async () => {
    const { router } = renderAt(<ChildSwitch />);
    await router.load();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('a guardian of several: the child in view, a link to switch', async () => {
    picked.child = kid({ name: 'يوسف' });
    renderAt(<ChildSwitch />);
    const name = t.portal.app.pick.open.replace('{name}', 'يوسف');
    const link = await screen.findByRole('link', { name });
    expect(link.getAttribute('href')).toBe('/children');
    expect(link.textContent).toBe('يوسف');
  });
});
