import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { home, kid } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { FamilyShell } from './FamilyShell';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (path: string) =>
    path === '/portal/me' ? home({ kind: 'student', students: [kid()] }) : { items: [], unread: 0 },
  );
});

describe('FamilyShell', () => {
  it('the page inside the main landmark', async () => {
    renderAt(
      <FamilyShell>
        <p>page</p>
      </FamilyShell>,
      '/portal',
    );
    expect(within(await screen.findByRole('main')).getByText('page')).toBeTruthy();
  });

  it('the app name twice (rail and header), the tabs and the bell', async () => {
    renderAt(
      <FamilyShell>
        <p>page</p>
      </FamilyShell>,
      '/portal',
    );
    expect(await screen.findByRole('link', { name: t.portal.app.tabs.home })).toBeTruthy();
    expect(screen.getAllByText(t.familyApp.signIn.wordmark)).toHaveLength(2);
    expect(screen.getByRole('link', { name: t.bell.open })).toBeTruthy();
  });
});
