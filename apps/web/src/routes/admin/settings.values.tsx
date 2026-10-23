import { createFileRoute } from '@tanstack/react-router';
import { parseValuesSearch } from '@/features/settings/values/values-search';
import { ValuesPage } from '@/features/settings/values/ValuesPage';

/** /admin/settings/values — «القيم»: one group per view (`?group=`), docs/26b §2. */
export const Route = createFileRoute('/admin/settings/values')({
  validateSearch: parseValuesSearch,
  component: ValuesPage,
});
