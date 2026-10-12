import type { ThreadView } from '@ab/shared';
import { SalesRegisterAction } from '../SalesRegisterAction';
import { SalesSubscribeAction } from './SalesSubscribeAction';

/**
 * The header actions of a sales chat (R-ASST-01, R-ASST-04): «تسجيل طالب جديد» on a lead, and on a
 * family with her students «اشتراك جديد» / «سجّل تحويلًا بنكيًا». Each one renders nothing elsewhere.
 */
export function SalesChatActions({ thread }: { thread: ThreadView }) {
  return (
    <>
      <SalesRegisterAction thread={thread} />
      <SalesSubscribeAction thread={thread} />
    </>
  );
}
