import { refundOffer, type RefundChoice } from '@ab/client-core';
import type { CourseStopPreview } from '@ab/shared';
import { useState } from 'react';
import { usePermissions } from '@/features/people/auth';

/**
 * «إلغاء فقط» / «إلغاء مع استرداد» (owner 2026-11-02): the sheet's choice and amount, offered with
 * subscriptions.refund and something to refund (the same rule as mobile, @ab/client-core).
 */
export function useRefundOffer(preview: CourseStopPreview | undefined) {
  const [choice, setChoice] = useState<RefundChoice>('cancel');
  const [amount, setAmount] = useState('');
  const { can } = usePermissions();
  const { breakdown, asked } = refundOffer({
    holds: can('subscriptions.refund'),
    refund: preview?.refund,
    currency: preview?.currency ?? '',
    choice,
    text: amount,
  });
  const state = { choice, onChoice: setChoice, amount, onAmount: setAmount };
  return { asked, refund: breakdown ? { ...state, breakdown } : null };
}
