import { declineLine } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { ButtonRow } from '@ab/web-kit/components/ui/layout/button-row';
import { MoveReason } from '@ab/web-kit/schedule/MoveReason';
import { t } from '@ab/web-kit/lib/i18n/i18n';

interface DeclinePanelProps {
  lesson: PortalLesson;
  busy: boolean;
  onDecline: (reason: string) => void;
  onBack: () => void;
}

const A = t.portal.actions;

export function DeclinePanel({ lesson, busy, onDecline, onBack }: DeclinePanelProps) {
  const [reason, setReason] = useState('');
  return (
    <div className="grid gap-3 rounded-md bg-sunk p-3">
      <p className="text-sm font-semibold">{A.declineTitle}</p>
      <p className="text-sm text-ink-2">{A[declineLine(lesson)]}</p>
      <MoveReason value={reason} onChange={setReason} label={A.reasonLabel} hint="" />
      <ButtonRow>
        <Button type="button" disabled={busy} onClick={() => onDecline(reason.trim())}>
          {A.declineConfirm}
        </Button>
        <Button type="button" variant="secondary" onClick={onBack}>
          {A.back}
        </Button>
      </ButtonRow>
    </div>
  );
}
