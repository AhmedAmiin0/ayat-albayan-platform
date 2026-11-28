import { z } from 'zod';
import { layerNameSchema, layerSchema } from './map/index.ts';

export const LAYERS = z
  .record(layerNameSchema, layerSchema)
  .readonly()
  .decode({
    api: {
      workspace: 'apps/api',
      root: 'apps/api/src/modules',
      extras: [],
      routes: [],
      alias: true,
    },
    shared: {
      workspace: 'packages/shared',
      root: 'packages/shared/src',
      extras: ['events', 'testing', 'package-checks'],
      routes: [],
      alias: false,
    },
    'client-core': {
      workspace: 'packages/client-core',
      root: 'packages/client-core/src',
      extras: ['core'],
      routes: [],
      alias: false,
    },
    'staff-web': {
      workspace: 'apps/staff-web',
      root: 'apps/staff-web/src/features',
      extras: [],
      routes: ['apps/staff-web/src/routes', 'apps/staff-web/src/routeTree.gen.ts'],
      alias: true,
    },
    'family-web': {
      workspace: 'apps/family-web',
      root: 'apps/family-web/src/features',
      extras: [],
      routes: ['apps/family-web/src/routes', 'apps/family-web/src/routeTree.gen.ts'],
      alias: true,
    },
    'staff-mobile': {
      workspace: 'apps/staff-mobile',
      root: 'apps/staff-mobile/src/features',
      extras: [],
      routes: ['apps/staff-mobile/app'],
      alias: true,
    },
    'family-mobile': {
      workspace: 'apps/family-mobile',
      root: 'apps/family-mobile/src/features',
      extras: [],
      routes: ['apps/family-mobile/app'],
      alias: true,
    },
  });

export const under = (path: string, dir: string): boolean =>
  path === dir || path.startsWith(`${dir}/`);
