// Entity registry. Builders add one import + one array entry each; order here does not matter
// (the pipeline runs modules in APPLY_ORDER).
import { leadsModule } from '../map/leads/leads.ts';
import { messagesModule } from '../map/messages/messages.ts';
import { messageTemplatesModule } from '../map/templates/templates.ts';
import { SHEET_MODULES } from '../sources/sheets/modules.ts';
import type { EntityModule } from './contract.ts';

export const ENTITY_MODULES: readonly EntityModule[] = [
  ...SHEET_MODULES,
  leadsModule,
  messageTemplatesModule,
  messagesModule,
];
