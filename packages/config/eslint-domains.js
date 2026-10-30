// docs/32 g1: interim boundaries while an app regroups its flat features into domains (`src/sales/app`,
// `src/finance/payments`). A converted domain's modules sit two levels deep; every other folder stays a
// one-level module until its own move PR adds its domain here. With no domain the output is today's config.

const NAME = /^[a-z0-9][a-z0-9-]*$/;
const alt = (names) => names.map((n) => `${n}/`).join('|');
const checked = (names) => {
  for (const n of names) if (!NAME.test(n)) throw new Error(`folder name «${n}»: kebab-case only`);
  return names;
};

/**
 * The `module` regex for `boundaries()`: `<base>/<domain>/<module>` for a converted domain, `<base>/<feature>`
 * for the rest; `exempt` folders (shared code) are no module at all.
 */
export function domainModuleRegex({ base, exempt, domains = [] }) {
  const flat = `(?!${alt(checked([...exempt, ...domains]))})[^/]+`;
  if (domains.length === 0) return `${base}/${flat}`;
  return `${base}/(?:(?:${domains.join('|')})/[^/]+|${flat})`;
}

/**
 * `no-restricted-imports` patterns for route files (gitignore order: later lines win): a feature only through
 * its index (`@/inbox`, `@/sales/app`), never its internals; `exempt` folders are free.
 */
export function routeImportGroup({ prefix, exempt, domains = [] }) {
  checked([...exempt, ...domains]);
  return [
    `${prefix}*/**`,
    ...exempt.map((e) => `!${prefix}${e}/**`),
    ...domains.flatMap((d) => [`!${prefix}${d}/*`, `${prefix}${d}/*/**`]),
  ];
}
