import { z } from 'zod';

/** Whose photo an admin edits: a teacher (teachers.write) or a staff login (users.write). */
export const staffPhotoKindSchema = z.enum(['teachers', 'users']);
export type StaffPhotoKind = z.infer<typeof staffPhotoKindSchema>;

const staffPhotoTargetSchema = z.object({ kind: staffPhotoKindSchema, id: z.string() });
export type StaffPhotoTarget = z.infer<typeof staffPhotoTargetSchema>;
