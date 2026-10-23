import { integrationOverlay } from './common/integrations/integration-overlay';

// What loadEnv() tries, in order, before env alone (env.ts). Legacy (numbers null): exactly the old
// behaviour, process.env with the integration overlay on top when it holds anything. Module: the
// numbers' line keys on top of both, then on top of env alone should the integration overlay not fit.

export function envCandidates(env: NodeJS.ProcessEnv, numbers: Readonly<Record<string, string>> | null): NodeJS.ProcessEnv[] {
  const overlay = integrationOverlay();
  if (numbers === null) return Object.keys(overlay).length === 0 ? [] : [{ ...env, ...overlay }];
  return [{ ...env, ...overlay, ...numbers }, { ...env, ...numbers }];
}
