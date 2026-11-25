import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';
import type { DriveBackupKeys, GoogleKeys, TranslationKeys } from './platform.keys.types';

const google = ['google'] as const;
const translations = ['translations'] as const;

// A student mapping invalidates `students()`, which reaches every search under it.
export const googleKeys: GoogleKeys = {
  all: google,
  status: () => [...google, 'status'],
  teachers: () => [...google, 'teachers'],
  students: () => [...google, 'students'],
  studentSearch: (q) => [...google, 'students', q],
  items: () => [...google, 'items'],
  teacherCalendar: (teacherId) => [...google, 'teacher-calendar', teacherId],
};

export const translationKeys: TranslationKeys = {
  all: translations,
  list: (search) => [...translations, search],
};

// Under the integrations settings, so a saved integration also re-reads the backup state.
export const driveBackupKeys: DriveBackupKeys = {
  backup: () => [...CONFIG_QUERY_KEYS.integrations, 'storage-backup'],
};
