import type { Browser, BrowserContextOptions } from '@playwright/test';
import type { StoreFamily } from '../store/store.types';

export type App = 'staff' | 'family';

export type StaffRole = 'admin' | 'sales' | 'teacher' | 'assistant';
export type FamilyRole = 'guardian' | 'student';
export type Role = StaffRole | FamilyRole | 'public';

export type VariantName =
  '1440-light' | '1440-dark' | '768-light' | '390-light' | '390-en' | 'empty';

export interface Variant {
  name: VariantName;
  width: number;
  height: number;
  theme: 'light' | 'dark';
}

/** The first seeded row behind each detail route param. */
export interface Seeded {
  studentId: string;
  teacherId: string;
  lessonId: string;
  reportId: string;
  publicId: string;
  assistantId: string;
  shortCode: string;
  meetingId: string;
}

export interface Filled {
  url: string;
  how: string;
}

export interface ShotName {
  app: App;
  role: Role;
  route: string;
  variant: VariantName;
  dialog?: number;
}

export interface IndexEntry {
  app: App;
  role: Role;
  route: string;
  url: string;
  variant: VariantName;
  file: string;
  reached: string;
}

export interface Skipped {
  app: App;
  role: Role;
  route: string;
  reason: string;
}

export interface Job {
  browser: Browser;
  app: App;
  role: Role;
  base: string;
  state?: BrowserContextOptions['storageState'];
  entries: IndexEntry[];
}

export interface Target {
  route: string;
  url: string;
  how: string;
}

export interface Pass {
  targets: Target[];
  variants: readonly Variant[];
  skipped: Skipped[];
  dialogs: boolean;
}

export interface SeedState {
  family: Pick<StoreFamily, 'phone' | 'first' | 'second'>;
  seeded: Seeded;
}

export interface Part {
  entries: IndexEntry[];
  skipped: Skipped[];
}
