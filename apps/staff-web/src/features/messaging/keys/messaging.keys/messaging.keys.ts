import type { CatalogueKeys, MessagingKeys, TemplateKeys } from './messaging.keys.types';

const templates = ['templates'] as const;
const catalogue = ['admin-notifications'] as const;

// A template write invalidates `all`, so the lines and the authored list refresh with it.
export const templateKeys: TemplateKeys = {
  all: templates,
  lines: () => [...templates, 'lines'],
  authored: () => [...templates, 'authored'],
};

// The lines check is never fetched by itself: it only holds the last answer LinesCard wrote.
export const messagingKeys: MessagingKeys = {
  sendGate: () => ['send-gate'],
  linesCheck: () => ['messaging', 'lines-check'],
};

// A settings or line change bumps the version; a sync invalidates `all` to reach every version.
export const catalogueKeys: CatalogueKeys = {
  all: catalogue,
  version: (version) => [...catalogue, version],
};
