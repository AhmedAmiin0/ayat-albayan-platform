import { needsSetup } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch, pathKey } from '@ab/mobile-kit';

/** The /auth/me fields setup reads (the body keeps more; anything odd is «no setup»). */
const meFields = z.looseObject({
  role: z.string().nullable().catch(null),
  email: z.string().nullable().catch(null),
});

/** docs/46 A4: until an email and password are set; reads the cached /auth/me. */
export function useNeedsSetup(): boolean {
  const me = useQuery({
    queryKey: pathKey('/auth/me'),
    queryFn: () => apiFetch('/auth/me'),
  });
  const parsed = meFields.safeParse(me.data);
  return parsed.success && needsSetup(parsed.data);
}
