import { describe, expect, it } from 'vitest';
import { signInRoutes } from './sign-in.routes';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;

const session = {
  access_token: 'a',
  refresh_token: 'r',
  expires_in: 3600,
  expires_at: null,
};

describe('signInRoutes (docs/30 §6, docs/46 A1-A2)', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(signInRoutes).map(line)).toEqual([
      'GET /auth/code/status',
      'POST /auth/staff-code/request',
      'POST /auth/staff-code/verify',
      'POST /auth/code/request',
      'POST /auth/code/verify',
      'POST /auth/login',
      'POST /auth/password/forgot',
      'POST /auth/password/reset',
    ]);
  });

  it('answers nothing to a code request, a forgot and a reset', () => {
    const { request, staffRequest, forgot, reset } = signInRoutes;
    expect([request, staffRequest, forgot, reset].map((r) => r.response)).toEqual(
      Array(4).fill('empty'),
    );
  });

  it('reads a status without staff as no staff codes', () => {
    const { response } = signInRoutes.status;
    expect(response.parse({ available: true })).toEqual({ available: true, staff: false });
  });

  it('answers a password session and refuses one without its refresh token', () => {
    const { response } = signInRoutes.login;
    expect(response.parse(session)).toEqual(session);
    const { refresh_token: _dropped, ...partial } = session;
    expect(response.safeParse(partial).success).toBe(false);
  });

  it('answers only the token hash of a verified code', () => {
    const { response } = signInRoutes.staffVerify;
    const answer = { token_hash: 'h', type: 'magiclink', action_link: 'x' };
    expect(response.parse(answer)).toEqual({ token_hash: 'h', type: 'magiclink' });
    expect(response.safeParse({ token_hash: 'h', type: 'signup' }).success).toBe(false);
  });

  it('folds Arabic-Indic digits of a typed code and refuses a short one', () => {
    const { body } = signInRoutes.verify;
    expect(body.parse({ phone: '+966500000001', code: '١٢٣ ٤٥٦' }).code).toBe('123456');
    expect(body.safeParse({ phone: '+966500000001', code: '123' }).success).toBe(false);
  });
});
