import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';

type StudentSearchProps = { initial: string; onSearch: (term: string) => void };

/** Name / phone / code search; the search icon is the submit button (R-STU-01). */
export function StudentSearch({ initial, onSearch }: StudentSearchProps) {
  const [term, setTerm] = useState(initial);
  return (
    <form
      role="search"
      className="relative w-full sm:max-w-[340px]"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(term.trim());
      }}
    >
      <Input
        aria-label={t.common.search}
        placeholder={t.students.searchPlaceholder}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="ps-10"
      />
      <IconButton type="submit" label={t.common.search} className="absolute inset-y-0 start-1 my-auto">
        <Icon name="search" />
      </IconButton>
    </form>
  );
}
