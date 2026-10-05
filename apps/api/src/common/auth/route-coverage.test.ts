import { isExemptRoute, permissionForRoute, ROUTE_PERMISSIONS } from '@ab/shared';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanControllers, scanFile } from './controller-scan';

const routes = scanControllers(join(__dirname, '../..'));
const adminRoutes = routes.filter((r) => !r.isPublic && !r.requiresPermission && r.roles?.includes('admin'));
const label = (r: { method: string; path: string }): string => `${r.method} ${r.path}`;

describe('controller scanner', () => {
  it('reads class-level and method-level decorators', () => {
    const src = [
      "@Roles('admin')",
      "@Controller('things')",
      'export class ThingsController {',
      "  @Get(':id')",
      '  one() {}',
      "  @Roles('teacher')",
      "  @Post('go')",
      '  go(',
      '    @Body() b: unknown,',
      '  ) {}',
      '  @Public()',
      '  @Get()',
      '  open() {}',
      '}',
    ].join('\n');
    const found = scanFile('x.ts', src).map((r) => [label(r), r.roles, r.isPublic]);
    expect(found).toEqual([
      ['GET /things/:id', ['admin'], false],
      ['POST /things/go', ['teacher'], false],
      ['GET /things', ['admin'], true],
    ]);
  });
});

describe('ROUTE_PERMISSIONS covers the admin API', () => {
  it('finds a believable number of admin routes', () => {
    expect(routes.length).toBeGreaterThan(150);
    expect(adminRoutes.length).toBeGreaterThan(100);
  });

  it('maps (or explicitly exempts) every route that admits the admin role', () => {
    const uncovered = adminRoutes
      .filter((r) => permissionForRoute(r.method, r.path) === null && !isExemptRoute(r.path))
      .map(label);
    expect(uncovered).toEqual([]);
  });

  it('asks for a view on reads and a manage on writes, except a few documented read-only POSTs', () => {
    const READ_ONLY_POSTS = new Set(['POST /subscriptions/quote', 'POST /booking/check']);
    const wrong = adminRoutes.flatMap((r) => {
      const needed = permissionForRoute(r.method, r.path);
      if (!needed) return [];
      const wantView = r.method === 'GET' || READ_ONLY_POSTS.has(label(r));
      return needed.endsWith(wantView ? '.view' : '.manage') ? [] : [`${label(r)} -> ${needed}`];
    });
    expect(wrong).toEqual([]);
  });

  it('has no rule that matches nothing in the API (typos), other than the documented spares', () => {
    const SPARE = new Set(['/users']);
    const dead = ROUTE_PERMISSIONS.filter((rule) => !SPARE.has(rule.prefix)).filter(
      (rule) => !routes.some((r) => permissionForRoute('GET', r.path, [{ ...rule, method: undefined }]) !== null),
    );
    expect(dead.map((r) => `${r.method ?? '*'} ${r.prefix}`)).toEqual([]);
  });
});
