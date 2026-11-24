import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import {
  GATE, GUARDIAN, json, OPEN_VIEW, showGate, stubApi, TARGET, TITLE,
} from '@/features/platform/short-links-gate/gate.test-kit';

const G = t.shortLinks.gate;
const OPEN = `POST ${GATE}/open`;
const viewed = { [`GET ${GATE}`]: () => json(200, OPEN_VIEW) };
const continueButton = () => screen.findByRole('button', { name: `${G.continueAs} أحمد علي` });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the gate for a signed-in visitor (board LinkXGateSignedIn)', () => {
  it('the title, «متابعة باسم <name>», «لست أنت؟ تسجيل الخروج»; no language switch', async () => {
    stubApi(viewed);
    showGate(GUARDIAN);
    expect(await continueButton()).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: TITLE })).toBeTruthy();
    expect(screen.getByText(G.linkFrom)).toBeTruthy();
    expect(screen.getByText(G.notYou)).toBeTruthy();
    expect(screen.getByRole('button', { name: G.signOut })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /English/ })).toBeNull();
  });

  it('«متابعة» opens with the session and goes to the target', async () => {
    const open = { outcome: 'open', target: TARGET };
    const calls = stubApi({ ...viewed, [OPEN]: () => json(200, open) });
    const { go } = showGate(GUARDIAN);
    fireEvent.click(await continueButton());
    await waitFor(() => expect(go).toHaveBeenCalledWith(TARGET));
    expect(calls.map((c) => c.route)).toContain(OPEN);
    expect(await screen.findByText(G.opening)).toBeTruthy();
    expect(screen.getByRole('link', { name: G.openManually }).getAttribute('href')).toBe(TARGET);
  });

  it('a target that is not http(s) is a dead end, never a navigation', async () => {
    const unsafe = { outcome: 'open', target: 'javascript:alert(1)' };
    stubApi({ ...viewed, [OPEN]: () => json(200, unsafe) });
    const { go } = showGate(GUARDIAN);
    fireEvent.click(await continueButton());
    expect(await screen.findByRole('heading', { name: G.notFoundTitle })).toBeTruthy();
    expect(screen.queryByText(G.opening)).toBeNull();
    expect(go).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: G.openManually })).toBeNull();
  });

  it('limit_reached: «اكتمل العدد المسموح به لهذا الرابط» (board LinkXGateFull)', async () => {
    stubApi({ ...viewed, [OPEN]: () => json(200, { outcome: 'limit_reached' }) });
    showGate(GUARDIAN);
    fireEvent.click(await continueButton());
    expect(await screen.findByRole('heading', { name: G.fullTitle })).toBeTruthy();
    expect(screen.getByText(G.fullBody)).toBeTruthy();
    expect(screen.queryByRole('button', { name: G.otherPhone })).toBeNull();
  });

  it('not_allowed: restricted, «أكّد رقمًا آخر» and sign-out (LinkXGateRestricted)', async () => {
    stubApi({ ...viewed, [OPEN]: () => json(200, { outcome: 'not_allowed' }) });
    showGate(GUARDIAN);
    fireEvent.click(await continueButton());
    expect(await screen.findByRole('heading', { name: G.restrictedTitle })).toBeTruthy();
    expect(screen.getByRole('button', { name: G.signOut })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: G.otherPhone }));
    expect(await screen.findByText(G.phoneTitle)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: TITLE })).toBeNull();
  });

  it('gone after the view loaded: the expired card', async () => {
    stubApi({ ...viewed, [OPEN]: () => json(200, { outcome: 'gone' }) });
    showGate(GUARDIAN);
    fireEvent.click(await continueButton());
    expect(await screen.findByRole('heading', { name: G.expiredTitle })).toBeTruthy();
  });

  it('an open that fails says so and stays', async () => {
    stubApi({ ...viewed, [OPEN]: () => json(500, {}) });
    showGate(GUARDIAN);
    fireEvent.click(await continueButton());
    expect(await screen.findByText(G.errors.generic)).toBeTruthy();
    expect(screen.getByRole('heading', { name: TITLE })).toBeTruthy();
  });
});
