import { participantIdentitySchema } from '@ab/schedule';
import { notFound } from '@/common/http/errors';

/** A room participant's identity that the api never minted. */
export const participantNotFound = () => notFound('participant_not_found');

/** The identity as minted, checked after the route's own params so a bad id answers 400 first. */
export function mintedIdentity(raw: string): string {
  const parsed = participantIdentitySchema.safeParse(raw);
  if (!parsed.success) throw participantNotFound();
  return parsed.data;
}
