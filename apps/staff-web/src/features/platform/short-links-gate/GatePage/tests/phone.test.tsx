import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CODE, GATE, json, OPEN_VIEW, showGate, stubApi, TITLE } from '@/features/platform/short-links-gate/gate.test-kit';

const G = t.shortLinks.gate;
const START = `POST ${GATE}/otp/start`;
const viewed = (view = OPEN_VIEW) => ({ [`GET ${GATE}`]: () => json(200, view) });
const phoneField = () => screen.findByLabelText(t.familyAuth.phone);
const sendButton = () => screen.getByRole('button', { name: G.sendCode });

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('ar');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the gate for a visitor who is not signed in (board LinkXGatePhone)', () => {
  it('hides the title, asks for the number and offers sign-in back to this gate', async () => {
    stubApi(viewed());
    showGate();
    expect(await phoneField()).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: G.fromAcademy })).toBeTruthy();
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(screen.getByText(G.phoneTitle)).toBeTruthy();
    expect(screen.getByText(G.phoneHint)).toBeTruthy();
    const login = screen.getByRole('link', { name: `${G.haveAccount} ${G.signIn}` });
    const href = new URL(login.getAttribute('href') ?? '', 'https://app.test');
    expect(href.pathname).toBe('/login');
    expect(href.searchParams.get('redirect')).toBe(`/l/${CODE}`);
    expect(screen.getByRole('button', { name: /English/ })).toBeTruthy();
  });

  it('a number that cannot be one: «اكتب رقم واتساب صحيحًا…», nothing sent', async () => {
    const calls = stubApi(viewed());
    showGate();
    fireEvent.change(await phoneField(), { target: { value: '50123' } });
    fireEvent.click(sendButton());
    expect(await screen.findByText(G.errors.invalid_phone)).toBeTruthy();
    expect(calls.map((c) => c.route)).not.toContain(START);
  });

  it('too many requests from the API says so', async () => {
    stubApi({ ...viewed(), [START]: () => json(429, { code: 'too_many_requests' }) });
    showGate();
    fireEvent.change(await phoneField(), { target: { value: '500000004' } });
    fireEvent.click(sendButton());
    expect(await screen.findByText(G.errors.too_many_requests)).toBeTruthy();
  });

  it('while codes cannot be sent: the message, and «أرسل الرمز» is off', async () => {
    stubApi(viewed({ ...OPEN_VIEW, codesAvailable: false }));
    showGate();
    expect(await screen.findByText(G.errors.codes_unavailable)).toBeTruthy();
    expect(sendButton()).toHaveProperty('disabled', true);
    expect(screen.getByRole('link', { name: `${G.haveAccount} ${G.signIn}` })).toBeTruthy();
  });
});
