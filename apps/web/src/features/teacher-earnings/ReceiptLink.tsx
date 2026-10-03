import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiErrorText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import { teacherReceiptUrl } from './api';

/** «عرض الإيصال»: asks for a short-lived signed URL when clicked and opens it in a new tab. */
export function ReceiptLink({ teacherId, paymentId }: { teacherId: string; paymentId: string }) {
  const [problem, setProblem] = useState<string | null>(null);
  const open = async () => {
    try {
      const { url } = await teacherReceiptUrl(teacherId, paymentId);
      setProblem(null);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setProblem(apiErrorText(e, t.teacherEarnings.error));
    }
  };
  return (
    <span className="inline-grid">
      <Button type="button" variant="ghost" size="sm" onClick={() => void open()}>
        {t.teacherEarnings.viewReceipt}
      </Button>
      {problem && (
        <span role="alert" className="text-xs text-danger">
          {problem}
        </span>
      )}
    </span>
  );
}
