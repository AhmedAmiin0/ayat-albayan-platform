import type { ThreadView } from '@ab/shared';
import { RegistrationCheckButton } from '@/features/sales/RegistrationCheckButton';
import { useInboxMode } from '../mode';
import { SalesRegisterAction } from '../SalesRegisterAction';
import { SalesSubscribeAction } from './SalesSubscribeAction';

/**
 * The header actions of a sales chat (R-ASST-01, R-ASST-04): «تسجيل طالب جديد» on a lead, and on a
 * family with her students «اشتراك جديد» / «سجّل تحويلًا بنكيًا». Each one renders nothing elsewhere.
 * «تحقق من التسجيل» (docs/16 row 23) checks the chat's number, with students.check_registration.
 */
export function SalesChatActions({ thread }: { thread: ThreadView }) {
  const sales = useInboxMode() === 'sales';
  return (
    <>
      {sales && <RegistrationCheckButton phone={thread.phone_e164} />}
      <SalesRegisterAction thread={thread} />
      <SalesSubscribeAction thread={thread} />
    </>
  );
}
