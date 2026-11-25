import { LinkedBody } from '@ab/web-kit';
import { useChatSearch } from './search-context';
import { SearchMarks } from './SearchMarks';

export function SearchableBody({ text }: { text: string }) {
  const q = useChatSearch()?.q ?? '';
  if (!q) return <LinkedBody text={text} />;
  return <LinkedBody text={text} mark={(part) => <SearchMarks text={part} q={q} />} />;
}
