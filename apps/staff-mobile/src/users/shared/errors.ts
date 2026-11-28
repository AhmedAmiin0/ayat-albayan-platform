import { userErrors } from '@ab/client-core';
import { t } from '@ab/mobile-kit';

// The API `code` to t.users.errors mapping is in @ab/client-core (docs/27 E3), shared with web.
export const { userErrorText, historyReferences, tableLabel } = userErrors(() => ({
  errors: t.users.errors,
  tables: t.users.tables,
}));
