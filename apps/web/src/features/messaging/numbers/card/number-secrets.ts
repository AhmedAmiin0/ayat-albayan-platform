import type { NumberSecretName, WaProvider } from '@ab/shared';

const META_SECRETS = ['access_token', 'app_secret'] as const;

/** Which secrets a number's driver uses: an Evolution number has only its instance token. */
const SECRETS: Record<WaProvider, readonly NumberSecretName[]> = {
  meta: META_SECRETS,
  kapso: META_SECRETS,
  crm: META_SECRETS,
  evolution: ['evolution_token'],
};

export const secretsOf = (provider: WaProvider): readonly NumberSecretName[] => SECRETS[provider];
