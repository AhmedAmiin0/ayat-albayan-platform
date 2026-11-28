import type { Domain } from '../map/index.ts';
import type { Allowed } from './tree.types.ts';

/** map.json domains as lookups: `notifications/bell` is feature bell of group notifications. */
export function allowedTree(domains: readonly Domain[]): Allowed {
  return new Map(
    domains.map((d) => {
      const groups = new Map(d.groups.map((g) => [g, [] as string[]]));
      const features: string[] = [];
      for (const f of d.features) {
        const [head, tail] = f.split('/');
        if (tail === undefined) features.push(head);
        else groups.get(head)?.push(tail);
      }
      return [d.domain, { features, groups }];
    }),
  );
}
