import { LinkedBody } from '@/components/ui/display/linked-body';
import { useChatSearch } from './search-context';
import { SearchMarks } from './SearchMarks';

/** A bubble's text with its links; while «بحث» runs, the searched words marked in it. */
export function SearchableBody({ text }: { text: string }) {
  const q = useChatSearch()?.q ?? '';
  if (!q) return <LinkedBody text={text} />;
  return <LinkedBody text={text} mark={(part) => <SearchMarks text={part} q={q} />} />;
}
