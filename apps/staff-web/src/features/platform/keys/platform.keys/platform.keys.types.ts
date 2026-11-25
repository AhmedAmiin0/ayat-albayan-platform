export type QueryKeyParts = readonly unknown[];

type None = () => QueryKeyParts;
type One<A> = (a: A) => QueryKeyParts;

export interface GoogleKeys {
  all: readonly ['google'];
  status: None;
  teachers: None;
  students: None;
  studentSearch: One<string>;
  items: None;
  teacherCalendar: One<string>;
}

export interface TranslationKeys {
  all: readonly ['translations'];
  list: One<unknown>;
}

export interface DriveBackupKeys {
  backup: None;
}
