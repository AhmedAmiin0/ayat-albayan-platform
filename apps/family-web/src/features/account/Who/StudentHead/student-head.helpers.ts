import { t } from '@ab/web-kit';

/** The words around the code, so the code alone sits in an LTR island. */
export function codeWords(): { before: string; after: string } {
  const [before = '', after = ''] = t.portal.app.account.code.split('{code}');
  return { before, after };
}
