import type { InvoicesUrlSearch } from '@/features/finance/finance/search';

export interface InvoicesPageProps {
  search: InvoicesUrlSearch;
  /** A patch of the URL search (the route re-validates it); `page: undefined` = page 1. */
  onSearch: (patch: Record<string, unknown>) => void;
}
