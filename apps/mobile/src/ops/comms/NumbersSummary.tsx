import { counted } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { NumberRow } from '../numbers/NumberRow';
import { useNumbers } from '../numbers/use-numbers';

/** How many numbers the overview shows in full; the rest are counted (the screen stays one phone high). */
export const SHOWN_NUMBERS = 1;

const h = () => t.communicationsHub;

/**
 * «الأرقام وحالتها» on the overview: the first numbers as read-only rows with their health chip, the
 * rest counted, and a button to the «الأرقام» tab. Editing stays on the web.
 */
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
          <View style={{ marginHorizontal: -16 }}>
            {numbers.slice(0, SHOWN_NUMBERS).map((n) => (
              <NumberRow key={n.id} number={n} />
            ))}
          </View>
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
