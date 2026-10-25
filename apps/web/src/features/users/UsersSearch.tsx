import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n';

export interface UsersSearchProps {
  initial: string;
  onSearch: (term: string) => void;
}

/** Name / email / phone search: applies 300 ms after the last key. */
export function UsersSearch({ initial, onSearch }: UsersSearchProps) {
  const [term, setTerm] = useState(initial);
  useEffect(() => {
    if (term.trim() === initial.trim()) return;
    const timer = setTimeout(() => onSearch(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term, initial, onSearch]);
  return (
    <div role="search" className="relative w-full sm:max-w-[340px]">
      <Input aria-label={t.common.search} placeholder={t.users.searchPlaceholder} value={term} onChange={(e) => setTerm(e.target.value)} className="ps-10" />
      <Icon name="search" className="pointer-events-none absolute inset-y-0 start-3 my-auto text-ink-3" />
    </div>
  );
}
