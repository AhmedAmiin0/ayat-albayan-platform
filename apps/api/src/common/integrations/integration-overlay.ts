// The integration config snapshot (owner, 2026-10-12: config in the database): the DB values of the
// registry keys (@ab/shared integrations), already checked key by key against the env schema.
// loadEnv() with its default source lays it over process.env, so a non-empty DB value wins and the
// env stays the fallback. IntegrationConfigService replaces it at boot, every integrationRefreshMs
// (integration-refresh.ts) and right after an admin write. Plain state with no imports, so env.ts
// can read it without a cycle.

let current: Readonly<Record<string, string>> = Object.freeze({});

/** The values in use from the database (secrets included: never log or return them). */
export function integrationOverlay(): Readonly<Record<string, string>> {
  return current;
}

export function setIntegrationOverlay(values: Readonly<Record<string, string>>): void {
  current = Object.freeze({ ...values });
}
