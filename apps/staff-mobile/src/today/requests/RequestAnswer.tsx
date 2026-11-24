import type { FamilyRequestView } from '@ab/shared';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { t, Button, ButtonRow, ErrorLine, MoveReason } from '@ab/mobile-kit';
import { ConflictNotice } from '@/booking';
import { LessonSlotPicker, useRescheduleFailure } from '@/teaching';
import { useAnswerRequest, type Answer } from './family-requests-api';
import { requestMinutes } from './request-text';

type Mode = 'answer' | 'other' | 'decline';

interface RequestAnswerProps {
  request: FamilyRequestView;
  onDone: () => void;
  /** The assistant's slot grid (GET /sales/booking/slots); default staff's. */
  slotsPath?: string;
}

const P = () => t.lessons.proposal;

/** A clash since the family asked answers 409; booking over it stays on the web. */
export function RequestAnswer({ request, onDone, slotsPath }: RequestAnswerProps) {
  const [mode, setMode] = useState<Mode>('answer');
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const answer = useAnswerRequest(request.id);
  const failure = useRescheduleFailure(answer);
  const send = (a: Answer) => answer.mutate(a, { onSuccess: onDone });
  const go = (next: Mode) => {
    answer.reset();
    setMode(next);
  };
  const fields: Record<Mode, ReactElement | null> = {
    answer: null,
    other: (
      <OtherSlot request={request} slotsPath={slotsPath} value={startsAt} onPick={setStartsAt} />
    ),
    decline: (
      <MoveReason
        value={note}
        onChange={setNote}
        label={P().decisionNote}
        placeholder={P().decisionNotePlaceholder}
        hint={P().decisionNoteHint}
      />
    ),
  };
  return (
    <View style={{ gap: 12 }}>
      {failure?.kind === 'conflict' ? (
        <ConflictNotice lines={failure.lines} onChangeSlot={() => go('other')} />
      ) : null}
      {failure?.kind === 'error' ? <ErrorLine message={failure.text} /> : null}
      {fields[mode]}
      <AnswerButtons
        mode={mode}
        busy={answer.isPending}
        onApprove={() => send({ kind: 'approve', body: startsAt ? { startsAt } : {} })}
        onReject={() => send({ kind: 'reject', note })}
        onMode={go}
        picked={mode !== 'other' || startsAt !== null}
      />
    </View>
  );
}

interface AnswerButtonsProps {
  mode: Mode;
  busy: boolean;
  picked: boolean;
  onApprove: () => void;
  onReject: () => void;
  onMode: (mode: Mode) => void;
}

function AnswerButtons({ mode, busy, picked, onApprove, onReject, onMode }: AnswerButtonsProps) {
  const back = <Button variant="ghost" label={t.portal.actions.back} onPress={() => onMode('answer')} />;
  const steps: Record<Mode, ReactElement> = {
    answer: (
      <View style={{ gap: 8 }}>
        <Button label={P().approve} onPress={onApprove} disabled={busy} />
        <Button variant="secondary" label={P().pickOther} onPress={() => onMode('other')} />
        <Button variant="ghost" label={P().rejectRequest} onPress={() => onMode('decline')} />
      </View>
    ),
    other: (
      <ButtonRow>
        <Button label={P().approve} onPress={onApprove} disabled={busy || !picked} />
        {back}
      </ButtonRow>
    ),
    decline: (
      <ButtonRow>
        <Button label={P().rejectRequest} onPress={onReject} disabled={busy} />
        {back}
      </ButtonRow>
    ),
  };
  return steps[mode];
}

interface OtherSlotProps {
  request: FamilyRequestView;
  slotsPath?: string;
  value: string | null;
  onPick: (startsAt: string) => void;
}

function OtherSlot({ request, slotsPath, value, onPick }: OtherSlotProps) {
  const { teacher, students } = request;
  const lesson = { id: request.lesson_id, starts_at: request.starts_at, teacher, students };
  return (
    <LessonSlotPicker
      lesson={lesson}
      durationMin={requestMinutes(request)}
      tz={students[0]?.tz ?? teacher.tz}
      value={value}
      onPick={onPick}
      slotsPath={slotsPath}
    />
  );
}
