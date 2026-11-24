import type { NumberView, ParityView } from '@ab/shared';
import { t, ErrorState, InsetGroup, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { NumberRow } from './NumberRow';
import { parityLine, sourceLine } from './numbers-words';
import { useNumbers, useParity } from './use-numbers';

const n = t.numbers;

function Loaded({ numbers, parity }: { numbers: NumberView[]; parity: ParityView }) {
  return (
    <>
      <Note>{sourceLine(parity)}</Note>
      <Note>{parityLine(parity)}</Note>
      {numbers.length === 0 ? (
        <Note>{n.empty}</Note>
      ) : (
        <InsetGroup>
          {numbers.map((number) => (
            <NumberRow key={number.id} number={number} />
          ))}
        </InsetGroup>
      )}
    </>
  );
}

/** docs/23 §3 phase 3: read-only, editing stays on the web. */
export function NumbersList() {
  const numbers = useNumbers();
  const parity = useParity();
  const retry = () => {
    if (numbers.isError) void numbers.refetch();
    if (parity.isError) void parity.refetch();
  };
  return (
    <Section title={n.title}>
      <Note>{n.mobile.note}</Note>
      {numbers.data && parity.data ? (
        <Loaded numbers={numbers.data} parity={parity.data} />
      ) : numbers.isError || parity.isError ? (
        <ErrorState message={n.loadError} onRetry={retry} />
      ) : (
        <Note>{t.common.loading}</Note>
      )}
    </Section>
  );
}
