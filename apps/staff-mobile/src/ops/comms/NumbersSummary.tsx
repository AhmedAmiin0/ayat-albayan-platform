import { counted } from '@ab/core';
import { t, Button, ErrorState, InsetGroup, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { NumberRow } from '@/ops/numbers/NumberRow';
import { useNumbers } from '@/ops/numbers/use-numbers';

/** Numbers shown in full; the rest are counted so the overview stays one phone high. */
const SHOWN_NUMBERS = 1;

const h = () => t.communicationsHub;

/** Read-only; editing stays on the web. */
export function NumbersSummary({ onOpen }: { onOpen: () => void }) {
  const query = useNumbers();
  const numbers = query.data;
  const rest = numbers ? numbers.length - SHOWN_NUMBERS : 0;
  return (
    <Section title={h().numbersTitle}>
      {numbers ? (
        numbers.length === 0 ? (
          <Note>{h().numbersEmpty}</Note>
        ) : (
          <InsetGroup>
            {numbers.slice(0, SHOWN_NUMBERS).map((n) => (
              <NumberRow key={n.id} number={n} />
            ))}
          </InsetGroup>
        )
      ) : query.isError ? (
        <ErrorState message={t.numbers.loadError} onRetry={() => void query.refetch()} />
      ) : (
        <Note>{t.common.loading}</Note>
      )}
      {rest > 0 ? <Note>{counted(h().mobile.moreNumbers, rest)}</Note> : null}
      <Button label={h().numbersOpen} variant="ghost" onPress={onOpen} />
    </Section>
  );
}
