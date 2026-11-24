import { CrmCopiesRepo } from './crm-copies.repo';
import { CrmCopyRefresh } from './crm-copy-refresh.job';
import { CrmSentText } from './crm-sent';

export { CrmCopiesRepo, CrmSentText };
/** WhatsappSharedModule's providers for the CRM's own template text. */
export const CRM_SENT_PROVIDERS = [CrmCopiesRepo, CrmSentText, CrmCopyRefresh];
