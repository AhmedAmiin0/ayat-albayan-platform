import type {
  ImportResult,
  NumberCreate,
  NumberSecretName,
  NumberUpdate,
  NumberView,
  OwnTrafficView,
} from '@ab/shared';

export interface NumberSecretTarget {
  id: string;
  name: NumberSecretName;
}

export interface NumbersCalls {
  list: () => Promise<NumberView[]>;
  ownTraffic: () => Promise<OwnTrafficView>;
  create: (body: NumberCreate) => Promise<NumberView>;
  update: (input: { id: string; body: NumberUpdate }) => Promise<NumberView>;
  remove: (id: string) => Promise<undefined>;
  putSecret: (input: NumberSecretTarget & { value: string }) => Promise<NumberView>;
  clearSecret: (input: NumberSecretTarget) => Promise<NumberView>;
  import: (dryRun: boolean) => Promise<ImportResult>;
}
