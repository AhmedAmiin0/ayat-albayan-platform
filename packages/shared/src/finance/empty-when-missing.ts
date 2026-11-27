import { z } from 'zod';

/** A POST sent without a body reads as `{}`, as the handlers took it before the routes moved. */
export const emptyWhenMissing = <S extends z.ZodType>(schema: S) =>
  z.preprocess((v) => v ?? {}, schema);
