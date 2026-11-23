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

const INDEX = ['index.ts', 'index.tsx'];

/**
 * `no-restricted-imports` patterns for route files (gitignore order: later lines win): a feature
 * only through its index (`#/inbox/index.ts`, `#/sales/app/index.ts`), never its internals;
 * `exempt` folders are free. Gitignore reads a leading `#` as a comment, so it is escaped.
 */
export function routeImportGroup({ prefix, exempt, domains = [] }) {
  checked([...exempt, ...domains]);
  const p = prefix.replace(/^#/, '\\#');
  const domain = (d) => [`!${p}${d}/*`, `${p}${d}/*/**`, ...INDEX.map((i) => `!${p}${d}/*/${i}`)];
  return [
    `${p}*/**`,
    ...INDEX.map((i) => `!${p}*/${i}`),
    ...exempt.map((e) => `!${p}${e}/**`),
    ...domains.flatMap(domain),
  ];
}
