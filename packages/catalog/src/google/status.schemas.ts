import { instant } from '@ab/core';
import { z } from 'zod';
import { GOOGLE_ACCOUNT_STATUSES, GOOGLE_SYNC_MODES, GOOGLE_SYNC_STATES } from './enums';

/** The connected academy account (google_account): never a token. */
export const googleConnectionViewSchema = z.object({
  status: z.enum(GOOGLE_ACCOUNT_STATUSES),
  email: z.string().nullable(),
  scopes: z.array(z.string()),
  connected_at: instant.nullable(),
  last_error: z.string().nullable(),
});
export type GoogleConnectionView = z.infer<typeof googleConnectionViewSchema>;

/** settings.google_sync_enabled / google_sync_mode / google_calendar_window_days. */
export const googleSyncSettingsSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(GOOGLE_SYNC_MODES),
  window_days: z.number().int(),
});
export type GoogleSyncSettings = z.infer<typeof googleSyncSettingsSchema>;

/** The Drive root and summary sheet, once an admin confirmed them. */
export const googleDriveViewSchema = z.object({
  root_folder_id: z.string().nullable(),
  root_folder_name: z.string().nullable(),
  summary_sheet_id: z.string().nullable(),
  confirmed_at: instant.nullable(),
});
export type GoogleDriveView = z.infer<typeof googleDriveViewSchema>;

/** One calendar or file found by discovery (POST /admin/google/discover). */
export const googleFoundSchema = z.object({ id: z.string(), name: z.string() });
export type GoogleFound = z.infer<typeof googleFoundSchema>;

/** What discovery found, kept on google_account until the next discovery. */
export const googleDiscoveryViewSchema = z.object({
  at: instant,
  calendars: z.array(googleFoundSchema),
  root_folder: googleFoundSchema.nullable(),
  summary_sheet: googleFoundSchema.nullable(),
});
export type GoogleDiscoveryView = z.infer<typeof googleDiscoveryViewSchema>;

const count = z.number().int().nonnegative();

/** GET /admin/google/status (admin; the mobile card reads it too). */
export const googleStatusViewSchema = z.object({
  configured: z.boolean(),
  connection: googleConnectionViewSchema,
  settings: googleSyncSettingsSchema,
  /** Exactly what the owner registers in the Google Cloud OAuth client. */
  redirect_uri: z.string(),
  scopes: z.array(z.string()).readonly(),
  drive: googleDriveViewSchema,
  discovery: googleDiscoveryViewSchema.nullable(),
  counts: z.record(z.enum(GOOGLE_SYNC_STATES), count),
  /** Items skipped because a teacher or a student is not mapped yet. */
  warnings: z.object({
    teacher_unmapped: count,
    student_unmapped: count,
    drive_unconfirmed: count,
  }),
  /** The calendars a live write will touch, for its confirmation. */
  targets: z.object({ main_calendar: z.string(), teacher_calendars: z.array(z.string()) }),
  last_run_at: instant.nullable(),
});
export type GoogleStatusView = z.infer<typeof googleStatusViewSchema>;

/** GET /admin/google/connect: the consent URL; the browser goes there itself. */
export const googleConnectUrlSchema = z.object({ url: z.string() });
export type GoogleConnectUrl = z.infer<typeof googleConnectUrlSchema>;
