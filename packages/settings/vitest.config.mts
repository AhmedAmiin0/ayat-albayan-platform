import { defineConfig } from 'vitest/config';

// Transforms persist across runs in <repo>/node_modules/.vitest-cache (ci.yml restores it).
export default defineConfig({ test: { fsModuleCache: true } });
