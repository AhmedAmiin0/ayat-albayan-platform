import type { Plugin, ViteUserConfig } from 'vitest/config';

type Kind = 'node' | 'web';

interface Options {
  /** 'web': jsdom, the web test env and the stylesheet rule (default 'node'). */
  kind?: Kind;
  /** Run before every test file: workspace-relative or absolute. */
  setupFiles?: string[];
}

const STYLESHEET = /\.css($|\?)/;
// fsModuleCache keys a module by its own content; Tailwind builds a stylesheet from every source
// file, so stylesheets are always transformed afresh, never read from the cache.
const noStylesheetCache: Plugin = {
  name: 'ab:no-stylesheet-fs-cache',
  configureVitest: ({ defineCacheKeyGenerator }) => {
    defineCacheKeyGenerator(({ id }) => (STYLESHEET.test(id) ? false : undefined));
  },
};

const KINDS = {
  node: { plugins: [], test: {} },
  web: {
    plugins: [noStylesheetCache],
    test: {
      environment: 'jsdom',
      // Multi-step wizard/drawer flows take ~1.5s alone and >5s under parallel `turbo test` load.
      testTimeout: 20_000,
      // tokens / motion / avatar-tones tests read their raw sheets; every other one stays stubbed.
      css: { include: [/styles\/(tokens|motion|avatar-tones)\.css/, /src\/index\.css/] },
      env: {
        VITE_SUPABASE_URL: 'http://sb.test',
        VITE_SUPABASE_ANON_KEY: 'anon',
        VITE_API_URL: 'http://api.test',
      },
    },
  },
} satisfies Record<Kind, Pick<ViteUserConfig, 'plugins' | 'test'>>;

/**
 * The config every vitest workspace starts from; a workspace adds its own plugins and env with
 * mergeConfig. Types-only imports, so Node loads this file without resolving anything.
 */
export function testConfig(options: Options = {}): ViteUserConfig {
  const { kind = 'node', setupFiles = [] } = options;
  const { plugins, test } = KINDS[kind];
  return {
    plugins,
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      // Transforms persist across runs in <repo>/node_modules/.vitest-cache (ci.yml restores it).
      fsModuleCache: true,
      setupFiles,
      ...test,
    },
  };
}
