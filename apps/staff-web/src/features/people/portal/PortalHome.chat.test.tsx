import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { home, kid } from '@ab/web-kit/portal/portal.fixtures';
import { portalApi, type Answers } from '@ab/web-kit/portal/portal.api-fixture';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { PortalHome } from './PortalHome';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const ON: Answers = { settings: { family_chat_enabled: true }, unread: { unread: 3 } };
const self = home({ kind: 'student', students: [kid({ contact_is_self: true })] });
const child = home({ kind: 'student', students: [kid()] });

async function tabsOf(answers: Answers): Promise<(string | null)[]> {
  apiFetch.mockImplementation(portalApi(answers));
  renderPortal(<PortalHome />);
  await screen.findByRole('tab', { name: t.portal.upcomingTab });
  await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/settings/public'));
  return screen.getAllByRole('tab').map((x) => x.textContent);
}

// docs/50 §2: the chat for every family login, a child's too (owner 2026-11-16), while
// family_chat_enabled is on.
describe('PortalHome: the teacher chat tab', () => {
  afterEach(() => apiFetch.mockReset());

  it('setting off (its default): no chat tab and no channel read, even for an adult', async () => {
    expect(await tabsOf({ me: self })).not.toContain(t.studentChannel.portalTab);
    expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/channel/'));
  });

  it('setting on: the adult who is their own contact gets it, with the unread count', async () => {
    await tabsOf({ ...ON, me: self });
    expect(await screen.findByRole('tab', { name: `${t.studentChannel.portalTab} (3)` })).toBeTruthy();
  });

  it('setting on: a child’s own login chats too (owner 2026-11-16)', async () => {
    await tabsOf({ ...ON, me: child });
    expect(await screen.findByRole('tab', { name: `${t.studentChannel.portalTab} (3)` })).toBeTruthy();
  });
});
