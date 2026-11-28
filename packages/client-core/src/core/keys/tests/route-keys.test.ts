import * as catalog from '@ab/catalog';
import { pathKey as corePathKey } from '@ab/core';
import * as schedule from '@ab/schedule';
import * as shared from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { pathKey } from '../query-keys';

const routeShape = z.looseObject({
  method: z.string(),
  path: z.string(),
  key: z.looseObject({
    all: z.array(z.string()),
    of: z.function({ input: [z.unknown()], output: z.array(z.unknown()) }),
  }),
});
type FoundRoute = z.infer<typeof routeShape>;

const asRoute = (value: unknown): FoundRoute[] => {
  const found = routeShape.safeParse(value);
  return found.success ? [found.data] : [];
};

const table = z.record(z.string(), z.unknown());
const tableRoutes = (value: unknown): FoundRoute[] =>
  Object.values(table.safeParse(value).data ?? {}).flatMap(asRoute);

const exported = [shared, catalog, schedule].flatMap((module) =>
  Object.values(module).flatMap((value) => [...asRoute(value), ...tableRoutes(value)]),
);

describe('every exported route object carries its query key', () => {
  it('finds the route tables', () => {
    expect(exported.length).toBeGreaterThan(100);
  });

  it.each(exported.map((route) => [`${route.method} ${route.path}`, route] as const))(
    '%s: key.all is the path key the key factories use',
    (_, route) => {
      expect(route.key.all).toEqual(pathKey(route.path));
      expect(route.key.all).toEqual(corePathKey(route.path));
      expect(route.key.of({ id: 'x' })).toEqual([...pathKey(route.path), { id: 'x' }]);
    },
  );
});
