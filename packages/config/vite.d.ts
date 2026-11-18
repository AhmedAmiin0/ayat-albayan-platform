import type { UserConfig } from 'vitest/config';

export interface WebConfigOptions {
  /** The workspace folder (import.meta.dirname). */
  dir: string;
  /** The dev server's port. */
  port: number;
  /** TanStack file routes in src/routes (default true). */
  routes?: boolean;
  /** A second dev server's own Vite cache. */
  cacheDir?: string;
}

/** The Vite + Vitest config of a web workspace (docs/51 §2). */
export declare function webConfig(options: WebConfigOptions): UserConfig;
