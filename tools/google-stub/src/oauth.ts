// OAuth 2.0 the way google-auth-library speaks it, auto-consenting: /o/oauth2/v2/auth redirects
// straight back with a code; /token trades it (or a refresh token) for fake tokens.
import { readBody, type Route } from './state.ts';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export const oauthRoutes: Route[] = [
  ['GET', /^\/o\/oauth2\/v2\/auth$/, async (_req, { url }) => {
    const redirect = url.searchParams.get('redirect_uri');
    if (!redirect) return [400, { error: 'invalid_request' }];
    const back = new URL(redirect);
    back.searchParams.set('code', 'stub-auth-code');
    back.searchParams.set('state', url.searchParams.get('state') ?? '');
    return { status: 302, location: back.toString() };
  }],
  ['POST', /^\/token$/, async (req, { s }) => {
    const form = new URLSearchParams((await readBody(req)).toString('utf8'));
    const grant = form.get('grant_type');
    if (grant === 'authorization_code') {
      if (form.get('code') !== 'stub-auth-code') return [400, { error: 'invalid_grant' }];
      return [200, { access_token: 'stub-access-token', refresh_token: 'stub-refresh-token', scope: SCOPES, expires_in: 3600, token_type: 'Bearer' }];
    }
    if (grant === 'refresh_token') {
      const token = form.get('refresh_token') ?? '';
      if (s.revoked.has(token)) return [400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }];
      return [200, { access_token: 'stub-access-token', scope: SCOPES, expires_in: 3600, token_type: 'Bearer' }];
    }
    return [400, { error: 'unsupported_grant_type' }];
  }],
  ['POST', /^\/revoke$/, async () => [200, {}]],
  ['GET', /^\/v1\/userinfo$/, async () => [200, { email: 'academy@stub.test', email_verified: true }]],
];
