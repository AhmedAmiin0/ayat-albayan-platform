import { notFound } from '@/common/http/errors';

/** A room participant's identity that the api never minted. */
export const participantNotFound = () => notFound('participant_not_found');
