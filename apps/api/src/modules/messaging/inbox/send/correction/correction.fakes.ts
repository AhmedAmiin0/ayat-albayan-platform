import { PHONE } from '@/modules/messaging/inbox/inbox.fakes';
import type { CorrectionTarget } from './correction.repo';

/** A sent staff text of the test chat: correctable unless `over` says otherwise. */
export const target = (over: Partial<CorrectionTarget> = {}): CorrectionTarget => ({
  id: 'a0000000-0000-4000-8000-0000000000c1',
  phone_e164: PHONE,
  direction: 'outbound',
  status: 'delivered',
  body: 'الحلقة الساعة الرابعة',
  media_mime: null,
  template_key: null,
  interactive_payload: null,
  wa_message_id: 'wamid.O',
  hidden_at: null,
  deleted_at: null,
  created_by: 'a0000000-0000-4000-8000-000000000001',
  ...over,
});
