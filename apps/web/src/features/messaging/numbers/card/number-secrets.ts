import type { NumberSecretName, NumberView, WaProvider } from '@ab/shared';

const META_SECRETS = ['access_token', 'app_secret'] as const;
const EVOLUTION_SECRETS = ['evolution_token', 'evolution_proxy_password'] as const;

/**
 * Which secrets a number's driver uses: an Evolution number has its instance token and proxy
 * password, and on a Cloud instance Meta's access token too.
 */
const SECRETS: Record<WaProvider, (view: NumberView) => readonly NumberSecretName[]> = {
  meta: () => META_SECRETS,
  kapso: () => META_SECRETS,
  crm: () => META_SECRETS,
  evolution: (view) =>
    view.evolution?.mode === 'cloud'
      ? [...EVOLUTION_SECRETS, 'evolution_cloud_token']
      : EVOLUTION_SECRETS,
};

export const secretsOf = (view: NumberView): readonly NumberSecretName[] =>
  SECRETS[view.provider](view);
