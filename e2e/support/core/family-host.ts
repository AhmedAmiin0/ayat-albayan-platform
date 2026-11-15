// The family web app's e2e server (apps/family-web, docs/51 §5): its own port beside the staff
// app's (playwright.config.ts webServer). The family specs drive it with absolute URLs.
const FAMILY_PORT = 5181;
export const FAMILY_URL = `http://localhost:${FAMILY_PORT}`;

/**
 * Its dev server: the e2e API, the staff app for «wrongApp», and its own Vite cache, so the two
 * dev servers never share pre-bundled deps. The staff server gets no VITE_FAMILY_ORIGIN: families
 * still sign in there for the specs that need it.
 */
export function familyWebServer(opts: { apiUrl: string; staffUrl: string; reuse: boolean }) {
  return {
    command: `pnpm exec vite --port ${FAMILY_PORT} --strictPort`,
    cwd: '../apps/family-web',
    url: FAMILY_URL,
    env: {
      VITE_API_URL: opts.apiUrl,
      VITE_STAFF_ORIGIN: opts.staffUrl,
      FAMILY_WEB_CACHE: 'node_modules/.vite-e2e',
    },
    reuseExistingServer: opts.reuse,
  };
}
