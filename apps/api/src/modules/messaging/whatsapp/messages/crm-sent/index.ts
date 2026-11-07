import { CrmCopiesRepo } from './crm-copies.repo';
import { CrmCopyRefresh } from './crm-copy-refresh.job';
import { CrmSentText } from './crm-sent';

/** WhatsappModule's providers for the CRM's own template text (owner 2026-11-07). */
export const CRM_SENT_PROVIDERS = [CrmCopiesRepo, CrmSentText, CrmCopyRefresh];
