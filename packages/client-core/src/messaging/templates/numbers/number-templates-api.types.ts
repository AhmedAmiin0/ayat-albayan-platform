import type { TemplateNumberSyncView } from '@ab/shared';

export interface NumberTemplateCalls {
  sync: (id: string) => Promise<TemplateNumberSyncView>;
}
