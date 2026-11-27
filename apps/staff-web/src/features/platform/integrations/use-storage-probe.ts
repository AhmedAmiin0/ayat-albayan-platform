import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError, t } from '@ab/web-kit';
import { probeStorage } from './integrations-api';

const s = t.integrations.storageProbe;

/** The refusals of POST /settings/integrations/storage-probe (api storage-probe.ts). */
const refusalSchema = z.object({
  message: z.enum(['storage_not_configured', 'storage_probe_failed', 'storage_public_failed']),
});

/** The API's refusal in words; anything else is «try again». */
export function storageProbeProblem(e: unknown): string {
  const parsed = refusalSchema.safeParse(e instanceof ApiError ? e.body : null);
  return parsed.success ? s.errors[parsed.data.message] : s.errors.unknown;
}

/** Nothing on the page changes. */
export function useStorageProbe() {
  return useMutation({
    mutationFn: async () => (await probeStorage()).data,
  });
}
