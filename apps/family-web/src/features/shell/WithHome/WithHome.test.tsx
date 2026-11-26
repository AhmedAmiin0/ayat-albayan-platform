import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { home, portalApi } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { WithHome } from './WithHome';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

beforeEach(() => {
  apiFetch.mockReset();
});

describe('WithHome', () => {
  it('renders the page with the login once GET /portal/me answers', async () => {
    apiFetch.mockImplementation(portalApi({ me: home({ kind: 'student' }) }));
    renderAt(<WithHome>{(me) => <p>{`kind ${me.kind}`}</p>}</WithHome>);
    expect(await screen.findByText('kind student')).toBeTruthy();
  });

  it('a skeleton until then, never the page', async () => {
    apiFetch.mockImplementation(() => new Promise(() => undefined));
    renderAt(<WithHome>{(me) => <p>{`kind ${me.kind}`}</p>}</WithHome>);
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.queryByText(/^kind/)).toBeNull();
  });
});
