import { useEffect, useState } from 'react';
import { z } from 'zod';
import { authApi } from '@ab/mobile-kit';

/** GET /auth/code/status as this screen reads it: anything else is «closed». */
const statusSchema = z.object({ staff: z.boolean() });

/** docs/46 A1: false while loading or on failure, so the code option simply hides. */
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
