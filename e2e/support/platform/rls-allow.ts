// Allow-lists of rls-catalogue.sql.spec.ts, built from the CI database: each entry says why
// that client may reach it. Shrink them; a new entry needs the owner's go in its PR.

export const ANON_READABLE: Record<string, string> = {
  translation_overrides: 'the sign-in page shows overridden Arabic strings before login',
};

export const ANON_DEFINERS: Record<string, string> = {};

export const AUTHENTICATED_DEFINERS: Record<string, string> = {};
