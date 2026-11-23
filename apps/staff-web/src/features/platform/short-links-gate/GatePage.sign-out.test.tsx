import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { GATE, GUARDIAN, json, OPEN_VIEW, showGate, stubApi } from './gate.test-kit';

const signOut = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@ab/web-kit/auth/sign-in/sign-in', () => ({ signOut }));

const G = t.shortLinks.gate;

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('ar');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('«لست أنت؟ تسجيل الخروج»: signed out here, then the number step', async () => {
  stubApi({ [`GET ${GATE}`]: () => json(200, OPEN_VIEW) });
  showGate(GUARDIAN);
  fireEvent.click(await screen.findByRole('button', { name: G.signOut }));
  expect(await screen.findByText(G.phoneTitle)).toBeTruthy();
  expect(signOut).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: new RegExp(G.continueAs) })).toBeNull();
});
