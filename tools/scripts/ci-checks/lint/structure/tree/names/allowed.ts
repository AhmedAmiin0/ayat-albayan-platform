import type { Domain } from '../../map/index.ts';
import type { Allowed } from '../tree.types.ts';

/** map.json domains as lookups: `notifications/bell` is feature bell of group notifications. */
export function allowedTree(domains: readonly Domain[]): Allowed {
  return new Map(
    domains.map((d) => {
      const split = d.features.map((f) => ({
        group: f.includes('/') ? f.split('/')[0] : '',
        name: f.split('/').at(-1) ?? f,
      }));
      const groups = new Map(
        d.groups.map((g) => [g, split.filter((s) => s.group === g).map((s) => s.name)]),
      );
      const features = split.filter((s) => s.group === '').map((s) => s.name);
      return [d.domain, { features, groups }];
    }),
  );
}
