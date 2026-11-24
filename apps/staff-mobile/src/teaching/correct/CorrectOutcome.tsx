import type { CorrectTo } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, ErrorLine, InlineConfirm } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';
import { Note } from '@/core/ui/feedback/Note';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';

interface CorrectOutcomeProps {
  /** correctionTargets(lesson, now): never the lesson's current status. */
  targets: readonly CorrectTo[];
  onCorrect: (to: CorrectTo) => void;
  busy?: boolean;
  /** Why the last correction was refused (e.g. 409 not_auto_held). */
  error?: string | undefined;
}

const askText = (to: CorrectTo): string => {
  const c = t.lessons.correct;
  return `${c.ask.replace('{to}', c.to[to])} ${c.counts[to]}`;
};

/** Ended needs-confirmation or job-settled lessons; a choice asks first and says if it counts. */
export function CorrectOutcome({ targets, onCorrect, busy = false, error }: CorrectOutcomeProps) {
  const [asking, setAsking] = useState<CorrectTo | null>(null);
  const c = t.lessons.correct;
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{c.outcomeTitle}</SectionLabel>
      <Note>{c.outcomeHint}</Note>
      {asking ? (
        <InlineConfirm
          message={askText(asking)}
          confirmLabel={c.confirm}
          cancelLabel={t.common.back}
          busy={busy}
          onConfirm={() => {
            setAsking(null);
            onCorrect(asking);
          }}
          onCancel={() => setAsking(null)}
        />
      ) : (
        <ButtonRow>
          {targets.map((to) => (
            <Button key={to} variant="secondary" label={c.to[to]} busy={busy} onPress={() => setAsking(to)} />
          ))}
        </ButtonRow>
      )}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
