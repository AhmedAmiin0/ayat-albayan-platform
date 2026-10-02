// Target resolution and the production guard. Secrets come only from env (tools/migrate/.env,
// git-ignored by the root `.env` rule); nothing here is a secret.
import type { TargetName } from './types.ts';

export const LOCAL_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];
/** Staging session pooler (port 5432 = session mode, prepared statements OK). */
export const STAGING_POOLER = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  user: 'postgres.knxfwiimjcifwckhwbim',
};

export interface StorageConfig {
  url: string;
  serviceKey: string;
}

export interface TargetConfig {
  name: TargetName;
  databaseUrl: string;
  ssl: boolean;
  /** Supabase API for Storage uploads (report PDFs); absent → PDF copy is planned but not applied. */
  storage?: StorageConfig;
}

export interface ResolveTargetInput {
  name: string | undefined;
  confirmProduction: boolean;
  env: NodeJS.ProcessEnv;
}

function storageFrom(url: string | undefined, key: string | undefined): StorageConfig | undefined {
  return url && key ? { url, serviceKey: key } : undefined;
}

function need(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`${name} is not set (tools/migrate/.env)`);
  return v;
}

/** Refuses production without --confirm-production, and a staging DSN that points anywhere else. */
export function resolveTarget(input: ResolveTargetInput): TargetConfig {
  const { env } = input;
  switch (input.name) {
    case 'local': {
      // '' (the .env.example shape) counts as unset; a shell DATABASE_URL wins over .env, so the
      // host is checked: --target local never reaches a remote database.
      const databaseUrl = env['DATABASE_URL'] || LOCAL_DATABASE_URL;
      if (!LOCAL_HOSTS.includes(new URL(databaseUrl).hostname)) {
        throw new Error('DATABASE_URL for --target local must point at 127.0.0.1 or localhost');
      }
      return {
        name: 'local',
        databaseUrl,
        ssl: false,
        storage: storageFrom(env['SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']),
      };
    }
    case 'staging': {
      const databaseUrl = need(env, 'STAGING_DATABASE_URL');
      const u = new URL(databaseUrl);
      if (
        u.hostname !== STAGING_POOLER.host ||
        decodeURIComponent(u.username) !== STAGING_POOLER.user
      ) {
        throw new Error('STAGING_DATABASE_URL does not point at the staging session pooler');
      }
      return {
        name: 'staging',
        databaseUrl,
        ssl: true,
        storage: storageFrom(env['STAGING_SUPABASE_URL'], env['STAGING_SUPABASE_SERVICE_ROLE_KEY']),
      };
    }
    case 'production': {
      if (!input.confirmProduction) {
        throw new Error(
          'Refusing production: pass --confirm-production once the owner has confirmed',
        );
      }
      return {
        name: 'production',
        databaseUrl: need(env, 'PRODUCTION_DATABASE_URL'),
        ssl: true,
        storage: storageFrom(
          env['PRODUCTION_SUPABASE_URL'],
          env['PRODUCTION_SUPABASE_SERVICE_ROLE_KEY'],
        ),
      };
    }
    default:
      throw new Error(
        `--target must be local, staging or production (got ${input.name ?? 'nothing'})`,
      );
  }
}
