import { formatPhone } from '@ab/core';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import {
  GATE, json, OPEN_VIEW, PHONE, type Routes, showGate, stubApi, TARGET,
} from '@/features/platform/short-links-gate/gate.test-kit';

const G = t.shortLinks.gate;
const START = `POST ${GATE}/otp/start`;
const VERIFY = `POST ${GATE}/otp/verify`;
const base: Routes = {
  [`GET ${GATE}`]: () => json(200, OPEN_VIEW),
  [START]: () => new Response(null, { status: 202 }),
};
const box = (n: number) => screen.getByLabelText(t.familyAuth.codeDigit.replace('{n}', String(n)));

/** The number sent: the code step shows. */
async function toCode(routes: Routes) {
  const calls = stubApi({ ...base, ...routes });
  const shown = showGate();
  const field = await screen.findByLabelText(t.familyAuth.phone);
  fireEvent.change(field, { target: { value: '0500000004' } });
  fireEvent.click(screen.getByRole('button', { name: G.sendCode }));
  expect(await screen.findByText(G.codeTitle)).toBeTruthy();
  return { calls, ...shown };
}

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('ar');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the code step (boards LinkXGateCode, LinkXGateCodeError)', () => {
  it('names the number, keeps the title hidden and counts down to «أعد إرسال الرمز»', async () => {
    const { calls } = await toCode({});
    expect(calls.find((c) => c.route === START)?.body).toBe(JSON.stringify({ phone: PHONE }));
    expect(screen.getByText(formatPhone(PHONE)).getAttribute('dir')).toBe('ltr');
    expect(screen.getByRole('heading', { level: 2, name: G.fromAcademy })).toBeTruthy();
    const wait = G.resendIn.split('{seconds}')[0] ?? '';
    const resend = screen.getByRole('button', { name: new RegExp(`^${wait}`) });
    expect(resend).toHaveProperty('disabled', true);
  });

  it('six digits and «تحقّق وافتح الرابط»: verified, then on to the target', async () => {
    const { calls, go } = await toCode({
      [VERIFY]: () => json(200, { outcome: 'open', target: TARGET }),
    });
    fireEvent.change(box(1), { target: { value: '481703' } });
    fireEvent.click(screen.getByRole('button', { name: G.verify }));
    await waitFor(() => expect(go).toHaveBeenCalledWith(TARGET));
    expect(calls.find((c) => c.route === VERIFY)?.body).toBe(
      JSON.stringify({ phone: PHONE, code: '481703' }),
    );
  });

  it('a wrong code: «الرمز غير صحيح…», the boxes marked invalid', async () => {
    await toCode({ [VERIFY]: () => json(401, { code: 'invalid_code' }) });
    fireEvent.change(box(1), { target: { value: '481703' } });
    fireEvent.click(screen.getByRole('button', { name: G.verify }));
    expect(await screen.findByText(G.errors.invalid_code)).toBeTruthy();
    expect(box(1).getAttribute('aria-invalid')).toBe('true');
  });

  it('fewer than six digits: «اكتب الأرقام الستة كاملة», nothing sent', async () => {
    const { calls } = await toCode({});
    fireEvent.change(box(1), { target: { value: '48' } });
    fireEvent.click(screen.getByRole('button', { name: G.verify }));
    expect(await screen.findByText(G.errors.code_incomplete)).toBeTruthy();
    expect(calls.map((c) => c.route)).not.toContain(VERIFY);
  });

  it('a verified phone that is not listed: the restricted card', async () => {
    await toCode({ [VERIFY]: () => json(200, { outcome: 'not_allowed' }) });
    fireEvent.change(box(1), { target: { value: '481703' } });
    fireEvent.click(screen.getByRole('button', { name: G.verify }));
    expect(await screen.findByRole('heading', { name: G.restrictedTitle })).toBeTruthy();
    expect(screen.queryByRole('button', { name: G.signOut })).toBeNull();
  });

  it('«غيّر الرقم» goes back to the number', async () => {
    await toCode({});
    fireEvent.click(screen.getByRole('button', { name: G.changePhone }));
    expect(await screen.findByText(G.phoneTitle)).toBeTruthy();
  });
});
