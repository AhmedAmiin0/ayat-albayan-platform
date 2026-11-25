import { HttpException } from '@nestjs/common';

/** PostgREST errors the error-path tests feed to a repo, one per answer the api gives today. */
export const PG_ERRORS = {
  unique: {
    code: '23505',
    message: 'duplicate key value',
    details: 'Key (id)=(x) already exists.',
  },
  foreignKey: { code: '23503', message: 'fk violation', details: 'Key (id)=(x) is not present.' },
  other: { code: 'XX000', message: 'boom' },
} as const;

/** What a client receives for a thrown error: Nest answers any non-HTTP error as 500. */
export function answerOf(error: unknown): { status: number; body: unknown } {
  if (error instanceof HttpException)
    return { status: error.getStatus(), body: error.getResponse() };
  return { status: 500, body: error instanceof Error ? error.message : String(error) };
}

/** Runs a call that must reject and returns the answer its error turns into. */
export async function answerOfRejection(
  call: Promise<unknown>,
): Promise<{ status: number; body: unknown }> {
  const settled = await call.then(
    () => null,
    (error: unknown) => answerOf(error),
  );
  if (settled === null) throw new Error('expected the call to reject');
  return settled;
}
