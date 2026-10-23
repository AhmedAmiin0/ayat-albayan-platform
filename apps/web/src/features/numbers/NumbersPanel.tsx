import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Section } from '@/components/settings/Section';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { usePermissions } from '../auth/use-permissions';
import { ImportButton } from './ImportButton';
import { NumberFormDialog } from './NumberFormDialog';
import { numbersQuery, parityQuery } from './numbers-api';
import { NumbersList } from './NumbersList';
import { NumbersNote } from './numbers-note';
import { NUMBERS_SECTION, numbersMatch } from './numbers-section';
import { ParityList } from './ParityList';
import { SourceSwitch } from './SourceSwitch';

const n = t.numbers;

/**
 * «الأرقام» (docs/23 §3 phase 3): each WhatsApp number as a card, the import of today's setup, the
 * parity between the two and the source switch. Sends stay on «التكاملات» until the switch flips.
 * Without numbers.manage everything is shown read-only.
 */
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
        {parity.isError && <p role="alert" className="text-sm text-danger">{n.parity.loadError}</p>}
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
