import type { MetaTemplate } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { CrmCopiesRepo } from './crm-copies.repo';

export interface CopiesDeps {
  /** Absent: the caller keeps no copy (a test, a template move). */
  copies?: Pick<CrmCopiesRepo, 'save'>;
  log: { warn: (message: string) => void };
}

const said = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * The CRM line's list just read, kept as our copy of each template's text (crm_template_copies).
 * Best effort: a failed write only logs; the sync and the sends never depend on it.
 */
export async function saveCrmCopies(
  deps: CopiesDeps,
  read: { list: readonly MetaTemplate[]; now: Date },
): Promise<void> {
  await deps.copies?.save(read.list, read.now).catch((e: unknown) => {
    deps.log.warn(`crm template copies not saved: ${said(e)}`);
  });
}
