import type {
  IntegrationConfigItem,
  IntegrationSecretKey,
  IntegrationValuesInput,
  StorageProbeResult,
} from '@ab/catalog';

export interface IntegrationSecretSave {
  key: IntegrationSecretKey;
  value: string;
}

export interface IntegrationCalls {
  list: () => Promise<IntegrationConfigItem[]>;
  saveValues: (body: IntegrationValuesInput) => Promise<IntegrationConfigItem[]>;
  saveSecret: (input: IntegrationSecretSave) => Promise<IntegrationConfigItem[]>;
  clearSecret: (key: IntegrationSecretKey) => Promise<IntegrationConfigItem[]>;
  probeStorage: () => Promise<{ data: StorageProbeResult }>;
}
