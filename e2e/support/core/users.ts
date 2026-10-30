import type { SeedUser } from './db';

/** Seed accounts (local/CI only). storageState per role lives in e2e/.auth/<role>.json. */
export const USERS = {
  admin: { email: 'admin@e2e.local', password: 'Admin-e2e-123', role: 'admin', fullName: 'مدير الاختبار' },
  teacher: { email: 'abrar@e2e.local', password: 'Teacher-e2e-123', role: 'teacher', fullName: 'أبرار' },
} as const satisfies Record<string, SeedUser>;

export const authFile = (role: keyof typeof USERS) => `.auth/${role}.json`;
