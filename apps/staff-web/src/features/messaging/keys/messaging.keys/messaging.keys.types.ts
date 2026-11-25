import type { QueryKey } from '@tanstack/react-query';

export interface TemplateKeys {
  all: readonly ['templates'];
  lines: () => QueryKey;
  authored: () => QueryKey;
}

export interface MessagingKeys {
  sendGate: () => QueryKey;
  linesCheck: () => QueryKey;
}

export interface CatalogueKeys {
  all: readonly ['admin-notifications'];
  version: (version: number) => QueryKey;
}
