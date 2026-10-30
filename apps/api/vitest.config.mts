import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// swc keeps Nest decorator metadata that esbuild/oxc would drop.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  // `@/x` → src/x, as in tsconfig.json `paths` (the build rewrites it with tsc-alias).
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.ts'],
    // Dummy values so AppModule boots in tests; createClient makes no network call on construction.
    env: {
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      // No database at boot: the integration-config load is tested on its own (common/integrations).
      INTEGRATION_CONFIG_FROM_DB: 'false',
    },
  },
});
