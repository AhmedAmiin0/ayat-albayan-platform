import type {
  EvolutionConfigInput,
  EvolutionQrView,
  EvolutionStateView,
  EvolutionSyncView,
} from '@ab/shared';

export interface EvolutionConfigSave {
  id: string;
  config: EvolutionConfigInput;
}

export interface EvolutionCalls {
  state: (id: string) => Promise<EvolutionStateView>;
  qr: (id: string) => Promise<EvolutionQrView>;
  saveConfig: (input: EvolutionConfigSave) => Promise<EvolutionSyncView>;
  push: (id: string) => Promise<EvolutionSyncView>;
  verify: (id: string) => Promise<EvolutionSyncView>;
}
