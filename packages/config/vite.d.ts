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
  /** Absolute folder of @ab/web-kit: its src/ is aliased, its public/ and icons/ are served. */
  kitDir: string;
  /** Absolute folder of @ab/catalog's brand marks, served at /brand/. */
  brandDir: string;
  /** The app's icon set in <kitDir>/icons/<name>, served at its root with the kit's public. */
  icons?: 'staff' | 'family';
  /** The app's name in its X-AB-Client tag, `<client>/<build>` (default 'web'). */
  client?: 'web' | 'family-web';
}

/** The Vite + Vitest config of a web workspace (docs/51 §2). */
export declare function webConfig(options: WebConfigOptions): UserConfig;
