import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { GATE, GUARDIAN, json, OPEN_VIEW, showGate, stubApi, TITLE } from '@/features/platform/short-links-gate/gate.test-kit';

const G = t.shortLinks.gate;
const view = (goneReason: 'expired' | 'revoked') => ({
  [`GET ${GATE}`]: () => json(200, { ...OPEN_VIEW, state: 'gone', goneReason }),
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the gate\'s dead ends (boards LinkXGateExpired, Revoked, NotFound)', () => {
  it('an unknown code (404): «لم نجد هذا الرابط»', async () => {
    stubApi({});
    showGate();
    expect(await screen.findByRole('heading', { name: G.notFoundTitle })).toBeTruthy();
    expect(screen.getByText(G.notFoundBody)).toBeTruthy();
    expect(screen.getByRole('button', { name: /English/ })).toBeTruthy();
  });

  it('expired: «انتهت صلاحية الرابط», even for a signed-in visitor, no title', async () => {
    stubApi(view('expired'));
    showGate(GUARDIAN);
    expect(await screen.findByRole('heading', { name: G.expiredTitle })).toBeTruthy();
    expect(screen.getByText(G.expiredBody)).toBeTruthy();
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(screen.queryByRole('button', { name: new RegExp(G.continueAs) })).toBeNull();
  });

  it('revoked: «أُلغي هذا الرابط»', async () => {
    stubApi(view('revoked'));
    showGate();
    expect(await screen.findByRole('heading', { name: G.revokedTitle })).toBeTruthy();
    expect(screen.getByText(G.revokedBody)).toBeTruthy();
  });

  it('a view that cannot be read (not a 404) says so', async () => {
    stubApi({ [`GET ${GATE}`]: () => json(500, {}) });
    showGate();
    expect(await screen.findByText(G.errors.generic)).toBeTruthy();
  });
});
