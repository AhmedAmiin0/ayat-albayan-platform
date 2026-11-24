import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Section } from '@/components/settings/Section';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { usePermissions } from '@ab/web-kit/auth/use-permissions';
import { ImportButton } from '@/features/messaging/numbers/import/ImportButton';
import { NumberFormDialog } from '@/features/messaging/numbers/form/NumberFormDialog';
import { numbersQuery, parityQuery } from '@/features/messaging/numbers/numbers-api';
import { NumbersList } from '@/features/messaging/numbers/NumbersList';
import { NumbersNote } from '@/features/messaging/numbers/numbers-note';
import { NUMBERS_SECTION, numbersMatch } from '@/features/messaging/numbers/numbers-section';
import { ParityList } from '@/features/messaging/numbers/card/ParityList';
import { SourceSwitch } from '@/features/messaging/numbers/import/SourceSwitch';

const n = t.numbers;

/** docs/23 §3 phase 3: sends stay on integrations until the source switch flips. */
export function NumbersPanel({ query, onSaved }: { query: string; onSaved: (message: string) => void }) {
  const { can } = usePermissions();
  const manage = can('numbers.manage');
  const list = useQuery(numbersQuery);
  const parity = useQuery(parityQuery);
  const [adding, setAdding] = useState(false);
  if (!numbersMatch(query)) return null;
  return (
    <NumbersNote.Provider value={onSaved}>
      <Section id={NUMBERS_SECTION.id} title={NUMBERS_SECTION.label}>
        <p className="max-w-[70ch] text-xs text-ink-3">{n.intro}</p>
        {!manage && <p role="note" className="text-xs font-semibold text-ink-2">{n.readOnly}</p>}
        {manage && <ImportButton />}
        <NumbersList numbers={list.data} failed={list.isError} manage={manage} />
        {manage && (
          <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => setAdding(true)}>
            {n.actions.add}
          </Button>
        )}
        {adding && <NumberFormDialog onClose={() => setAdding(false)} />}
        {parity.isError && <p className="text-sm text-ink-2">{n.parity.loadError}</p>}
        {parity.data && (
          <>
            <ParityList parity={parity.data} />
            <SourceSwitch parity={parity.data} manage={manage} />
          </>
        )}
      </Section>
    </NumbersNote.Provider>
  );
}
