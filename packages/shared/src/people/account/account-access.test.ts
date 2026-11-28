import type { RouteSpec } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { presenceRoutes } from '../presence/presence.routes';
import { pushTokenRoutes } from '../push-tokens/push-tokens.routes';
import { signInRoutes } from '../users/sign-in.routes';
import { accountRoutes, accountSetupRoutes } from './account.routes';

const tables = [presenceRoutes, pushTokenRoutes, signInRoutes, accountSetupRoutes, accountRoutes];

const accessLine = ({ method, path, permissions, tags }: RouteSpec) =>
  `${method} ${path} ${permissions?.join('|') ?? '-'} ${tags?.join(',') ?? '-'}`;

describe('accounts route objects carry the access the api checks today', () => {
  it('names the permission of every guarded route and the swagger tag of every route', () => {
    const lines = tables.flatMap((table) => Object.values(table).map(accessLine));
    expect(lines.toSorted()).toEqual([
      'DELETE /me/avatar - me',
      'DELETE /me/push-tokens/:token notifications.push me',
      'GET /auth/code/status - auth',
      'GET /me/profile - me',
      'GET /presence/me - presence',
      'GET /presence/staff users.read presence',
      'PATCH /me/locale - me',
      'PATCH /me/profile - me',
      'POST /auth/code/request - auth',
      'POST /auth/code/verify - auth',
      'POST /auth/login - auth',
      'POST /auth/password/forgot - auth',
      'POST /auth/password/reset - auth',
      'POST /auth/staff-code/request - auth',
      'POST /auth/staff-code/verify - auth',
      'POST /me/avatar/upload-url - me',
      'PUT /me/avatar - me',
      'PUT /me/email - me',
      'PUT /me/password - me',
      'PUT /me/push-tokens notifications.push me',
      'PUT /me/setup - me',
    ]);
  });
});
