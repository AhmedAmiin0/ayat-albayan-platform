import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { renderAt } from '@/test/render-at';
import { RouteError, RoutePending } from './RouteStates';

describe('the router screens (audit 2026-11-19 #19c)', () => {
  it('pending: the skeleton', async () => {
    renderAt(<RoutePending />);
    expect((await screen.findByRole('status')).getAttribute('aria-busy')).toBe('true');
  });

  it('error: the family-language words, a retry and the way home', async () => {
    const { router } = renderAt(<RouteError />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(t.familyWeb.routeError.title);
    const home = screen.getByRole('link', { name: t.familyWeb.routeError.home });
    expect(home.getAttribute('href')).toBe('/portal');
    fireEvent.click(screen.getByRole('button', { name: t.familyWeb.routeError.retry }));
    expect(router.state.location.pathname).toBe('/');
  });
});
