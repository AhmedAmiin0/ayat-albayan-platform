import { HttpStatus } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import type { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { httpError } from '@/common/http/errors';

type SalesScopeOf = Awaited<ReturnType<ThreadReads['salesScope']>>;

/**
 * Stickers and GIFs are files: the admin and sales only. A salesperson's scope (her dedup space
 * and audit), null for the admin; a teacher is 403 files_forbidden, as for a photo.
 */
export async function staffOnly(reads: ThreadReads, user: AuthUser): Promise<SalesScopeOf> {
  const sales = await reads.salesScope(user);
  const teacher = !sales && (await reads.scope(user)) !== null;
  if (teacher) throw httpError(HttpStatus.FORBIDDEN, 'files_forbidden');
  return sales;
}
