// A number's Vault secrets (wa_number:<id>:<name>, migration 20261106000500): names only, never a
// value. The Evolution ones: the instance key, a Cloud instance's Meta token, the proxy password.

export const NUMBER_SECRET_NAMES = [
  'access_token', 'app_secret', 'evolution_token', 'evolution_cloud_token',
  'evolution_proxy_password',
] as const;
export type NumberSecretName = (typeof NUMBER_SECRET_NAMES)[number];
