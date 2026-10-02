import { describe, expect, it } from 'vitest';
import { LOCAL_DATABASE_URL, resolveTarget } from './config.ts';

const STAGING =
  'postgresql://postgres.knxfwiimjcifwckhwbim:pw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

describe('resolveTarget', () => {
  it('local defaults to the supabase CLI database', () => {
    const t = resolveTarget({ name: 'local', confirmProduction: false, env: {} });
    expect(t).toEqual({
      name: 'local',
      databaseUrl: LOCAL_DATABASE_URL,
      ssl: false,
      storage: undefined,
    });
  });

  it('local honours a loopback DATABASE_URL and storage env', () => {
    const env = {
      DATABASE_URL: 'postgresql://x@localhost:5433/db',
      SUPABASE_URL: 'http://s',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
    };
    const t = resolveTarget({ name: 'local', confirmProduction: false, env });
    expect(t.databaseUrl).toBe('postgresql://x@localhost:5433/db');
    expect(t.storage).toEqual({ url: 'http://s', serviceKey: 'k' });
  });

  it('local treats an empty DATABASE_URL as unset and refuses a remote host', () => {
    const local = (DATABASE_URL: string) =>
      resolveTarget({ name: 'local', confirmProduction: false, env: { DATABASE_URL } });
    expect(local('').databaseUrl).toBe(LOCAL_DATABASE_URL);
    expect(() => local(STAGING)).toThrow(/127\.0\.0\.1 or localhost/);
  });

  it('staging needs the pooler DSN and nothing else', () => {
    expect(() => resolveTarget({ name: 'staging', confirmProduction: false, env: {} })).toThrow(
      /STAGING_DATABASE_URL/,
    );
    const t = resolveTarget({
      name: 'staging',
      confirmProduction: false,
      env: { STAGING_DATABASE_URL: STAGING },
    });
    expect(t).toMatchObject({ name: 'staging', ssl: true });
    const wrong = STAGING.replace('aws-1-eu-central-1.pooler.supabase.com', 'db.example.com');
    expect(() =>
      resolveTarget({
        name: 'staging',
        confirmProduction: false,
        env: { STAGING_DATABASE_URL: wrong },
      }),
    ).toThrow(/staging session pooler/);
  });

  it('production is refused without --confirm-production', () => {
    const env = { PRODUCTION_DATABASE_URL: 'postgresql://p@h/db' };
    expect(() => resolveTarget({ name: 'production', confirmProduction: false, env })).toThrow(
      /Refusing production/,
    );
    expect(resolveTarget({ name: 'production', confirmProduction: true, env }).name).toBe(
      'production',
    );
  });

  it('rejects unknown or missing targets', () => {
    expect(() => resolveTarget({ name: 'prod', confirmProduction: true, env: {} })).toThrow(
      /--target/,
    );
    expect(() => resolveTarget({ name: undefined, confirmProduction: false, env: {} })).toThrow(
      /nothing/,
    );
  });
});
