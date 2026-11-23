import { type Country, nameOf, orderCountries, searchCountries } from '@ab/client-core';
import { useState } from 'react';
import { EmptyState, Ltr } from '#/components/ui/display/index.ts';
import { SearchInput } from '#/components/ui/form/index.ts';
import { Dialog } from '#/components/ui/overlay/index.ts';
import { t, locale } from '#/lib/i18n/index.ts';
import { browserRegion } from './browser-country';

interface Props {
  current: Country;
  onPick: (country: Country) => void;
  onClose: () => void;
}

const S = t.familyApp.signIn;
const ROW =
  'flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-start hover:bg-sunk aria-[current=true]:font-semibold';

/**
 * «اختر الدولة» (#752, as the family app): every country (flag, name, calling code), the
 * browser's region and the academy's usual ones first, searchable by Arabic or English name or
 * by calling code (client-core). Render it conditionally: closing drops the search.
 */
export function CountryPicker({ current, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const all = orderCountries(browserRegion(navigator.language), locale);
  const shown = searchCountries(all, query);
  return (
    <Dialog title={S.countryTitle} onClose={onClose} layout="sheet" className="sm:max-w-[440px]">
      <div className="grid gap-3">
        <SearchInput
          aria-label={S.countrySearch}
          placeholder={S.countrySearch}
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {shown.length === 0 && <EmptyState title={S.countryNone} />}
        <ul className="grid">
          {shown.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                aria-current={c.code === current.code || undefined}
                onClick={() => onPick(c)}
                className={ROW}
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  {c.flag}
                </span>
                <span className="min-w-0 flex-1">{nameOf(c, locale)}</span>
                <Ltr className="text-sm text-ink-3">{c.dial}</Ltr>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
