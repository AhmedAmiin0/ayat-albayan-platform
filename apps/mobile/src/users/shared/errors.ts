import { userErrors } from '@ab/client-core';
import { t } from '@/core/lib/i18n/i18n';

// The API's `code` → t.users.errors: one mapping in @ab/client-core (docs/27 E3), shared with the web app.
export const { userErrorText, historyReferences, tableLabel } = userErrors(() => ({ errors: t.users.errors, tables: t.users.tables }));
