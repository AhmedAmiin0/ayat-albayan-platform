import { useEffect, useState } from 'react';
import { z } from 'zod';
import { authApi } from '@/core/auth/forgot';

/** GET /auth/code/status as this screen reads it: anything else is «closed». */
const statusSchema = z.object({ staff: z.boolean() });

/**
 * Can staff codes go out now (GET /auth/code/status `staff`, docs/46 A1)? false while loading or on
 * any failure: the login screen then simply shows no «الدخول برمز واتساب». Asked once per mount.
 */
export function useStaffCodes(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.resolve()
      .then(() => authApi.codeStatus())
      .then(
        (body: unknown) => live && setOpen(statusSchema.safeParse(body).data?.staff === true),
        () => live && setOpen(false),
      );
    return () => void (live = false);
  }, []);
  return open;
}
