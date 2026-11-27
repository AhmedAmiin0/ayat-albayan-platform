import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { home, portalApi } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { ChildPage } from './ChildPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const allChildren = () => screen.findByRole('link', { name: t.portal.allChildren });

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(portalApi());
});

describe('ChildPage', () => {
  it('a known child: the way back to every child, then the name heading', async () => {
    renderAt(<ChildPage home={home()} studentId="s2" onTab={vi.fn()} />);
    expect((await allChildren()).getAttribute('href')).toBe('/children');
    expect(screen.getByRole('heading', { level: 1, name: 'يوسف' })).toBeTruthy();
  });

  it('an unknown child: «not found», still with the way back', async () => {
    renderAt(<ChildPage home={home()} studentId="nobody" onTab={vi.fn()} />);
    expect(await screen.findByText(t.common.notFound)).toBeTruthy();
    expect(await allChildren()).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1, name: 'يوسف' })).toBeNull();
  });
});
