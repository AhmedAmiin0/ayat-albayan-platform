import { z } from 'zod';

/** The refusals of a staff photo write that have their own message. */
export const staffPhotoErrorSchema = z.enum([
  'avatar_not_staff',
  'avatar_type',
  'avatar_too_large',
  'avatar_path',
]);
