import { z } from 'zod';

export const UNCHECKED = 'unchecked';

const testFile = z.string().regex(/^apps\/api\/src\/.+\.test\.ts$/);

/** 'GET /portal/students/:id/lessons' → the test that sends another family's id, or «unchecked». */
export const ownershipBaseline = z.record(
  z.string().regex(/^[A-Z]+ \/\S*:\S*$/),
  z.union([z.literal(UNCHECKED), testFile]),
);
export type OwnershipBaseline = z.infer<typeof ownershipBaseline>;
