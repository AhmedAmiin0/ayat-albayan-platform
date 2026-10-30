// docs/32 g1: interim boundaries while an app regroups its flat features into domains (`src/sales/app`,
// `src/finance/payments`). A converted domain's modules sit two levels deep; every other folder stays a
// one-level module until its own move PR adds its domain here. With no domain the output is today's config.

const alt = (names) => names.map((n) => `${n}/`).join('|');

/**
 * The `module` regex for `boundaries()`: `<base>/<domain>/<module>` for a converted domain, `<base>/<feature>`
 * for the rest; `exempt` folders (shared code) are no module at all.
 */
export function domainModuleRegex({ base, exempt, domains = [] }) {
  const flat = `${base}/(?!${alt([...exempt, ...domains])})[^/]+`;
  if (domains.length === 0) return flat;
  return `${base}/(?:(?:${domains.join('|')})/[^/]+|(?!${alt([...exempt, ...domains])})[^/]+)`;
}

/**
 * `no-restricted-imports` patterns for route files (gitignore order: later lines win): a feature only through
 * its index (`@/inbox`, `@/sales/app`), never its internals; `exempt` folders are free.
 */
export function routeImportGroup({ prefix, exempt, domains = [] }) {
  return [
    `${prefix}*/**`,
    ...exempt.map((e) => `!${prefix}${e}/**`),
    ...domains.flatMap((d) => [`!${prefix}${d}/*`, `${prefix}${d}/*/**`]),
  ];
}
