import { nameOf } from '@ab/client-core';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { SearchInput } from '@ab/web-kit/components/ui/form/SearchInput';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import type { Props } from './CountryPicker.types';
import { S, ROW } from './country-picker.helpers';
import { useCountryPicker } from './use-country-picker';

/** Render it conditionally: closing drops the search. */
export function CountryPicker({ current, onPick, onClose }: Props) {
  const { query, setQuery, shown } = useCountryPicker();
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
