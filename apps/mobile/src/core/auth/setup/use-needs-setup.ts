import { needsSetup } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

/** The /auth/me fields setup reads (the body keeps more; anything odd is «no setup»). */
const meFields = z.looseObject({
  role: z.string().nullable().catch(null),
  email: z.string().nullable().catch(null),
});

/**
 * A teacher still on her code-made login (docs/46 A4): her tree shows «أكمل حسابك» until she sets
 * an email and a password. Reads the cached /auth/me (the gate loaded it before the tree mounted).
 */
export function useNeedsSetup(): boolean {
  const me = useQuery({
    queryKey: pathKey('/auth/me'),
    queryFn: () => apiFetch('/auth/me'),
  });
  const parsed = meFields.safeParse(me.data);
  return parsed.success && needsSetup(parsed.data);
}
