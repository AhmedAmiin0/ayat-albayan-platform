import { describe, expect, expectTypeOf, it } from 'vitest';
import * as root from '../index.js';
import type {
  AcademySettings,
  CamelKey,
  CustomConfigUpsert,
  CustomConfigView,
  FeedbackMode,
  GoogleSyncMode,
  IntegrationKey,
  IntegrationSecretKey,
  JoinWindowConfig,
  JsonDef,
  PublicConfig,
  PublicSettingKey,
  PublicSettings,
  SettingDef,
  SettingField,
  SettingKey,
  SettingMeta,
  SettingsMetaResponse,
  SettingsSectionId,
  SettingsUpdate,
  SettingValue,
  ShapeField,
} from '../index.js';

// Export-surface lock (settings segregation, 2026-10-23): every name the apps import from
// @ab/shared today must survive the move of the settings files (additions only).

const SETTINGS_NAMES = [
  'SETTINGS_REGISTRY', 'SETTINGS_SECTIONS', 'SETTING_KEYS', 'SETTING_DEFAULTS', 'SETTING_FIELD_OF', 'SETTING_KEY_OF',
  'FEEDBACK_MODES', 'PUBLIC_SETTING_KEYS', 'PUBLIC_SETTING_DEFAULTS', 'settingDef', 'isSettingKey', 'camelKey',
  'settingZod', 'settingsUpdateSchema', 'settingsChanges', 'isValidSetting', 'readSettings', 'publicSettings',
  'joinWindowConfig', 'uploadMaxBytes', 'academyWhatsappUrl',
];
const CUSTOM_CONFIG_NAMES = ['CUSTOM_KEY_RE', 'CUSTOM_VALUE_MAX_BYTES', 'customKeySchema', 'customConfigUpsertSchema', 'publicCustom'];
const INTEGRATIONS_NAMES = [
  'EMPTY_RECIPIENTS', 'INTEGRATION_ENUMS', 'INTEGRATION_GROUPS', 'INTEGRATION_KEYS', 'INTEGRATION_PLAIN_KEYS',
  'INTEGRATION_SECRET_KEYS', 'INTEGRATION_VALUE_CHECKS', 'INTEGRATION_VALUE_MAX', 'WA_PROVIDERS', 'googleClientId',
  'integrationDef', 'integrationEnum', 'integrationSecretSchema', 'integrationValueValid', 'integrationValuesSchema',
  'isIntegrationKey', 'isIntegrationPlainKey', 'isIntegrationSecretKey', 'parseAllowedRecipients', 'vapidPublicKey',
  'vapidSubject',
];
const GOOGLE_NAMES = [
  'GOOGLE_ACCOUNT_STATUSES', 'GOOGLE_ERROR_KEYS', 'GOOGLE_REDIRECT_URI_PRODUCTION', 'GOOGLE_SCOPES',
  'GOOGLE_SKIP_REASONS', 'GOOGLE_SYNC_KINDS', 'GOOGLE_SYNC_MODES', 'GOOGLE_SYNC_STATES', 'GOOGLE_WINDOW_DAYS',
  'driveFileLink', 'driveFolderLink', 'fileIdIn', 'folderIdIn', 'googleDriveSchema', 'googleErrorKey',
  'googleSettingsSchema', 'googleStudentMapSchema', 'googleTeacherMapSchema', 'sheetLink',
];
/** Added by the segregation (additions only). */
const NEW_NAMES = [
  'SETTINGS_LAYOUT', 'settingSection', 'PUBLIC_CONFIG_PATH', 'PUBLIC_CONFIG_QUERY_KEY', 'PUBLIC_CONFIG_STALE_MS',
  'withPublicDefaults', 'CATALOGUE_SETTING_KEYS', 'GOOGLE_SETTING_KEYS',
];

/** Every registry key with today's default (the migrations seed the same values). */
const DEFAULTS_LITERAL = Object.freeze({
  messaging_enabled: false, auto_messages_enabled: false, crm_cutover_done: false, comms_source: 'legacy', feedback_mode: 'buttons',
  reminder_minutes_before: 60, reminder_24h_enabled: false, teacher_whatsapp_new_student: true,
  teacher_whatsapp_lesson_reminder: true, follow_up_hours: [24, 72], reminder_lookahead_hours: 25,
  follow_up_slots_from_hours: 12, follow_up_slots_to_days: 7, quick_reply_window_hours: 48, whatsapp_calls_enabled: false, calls_permission_template: '',
  chat_reopen_template: 'inquiry_followup_ar_v2', crm_media_host: '', crm_media_copy_all: false,
  booking_horizon_weeks: 5, late_cancel_hours: null, makeup_window_days: 60, teachers_always_available: true,
  join_opens_before_min: 15, join_closes_after_min: 120, default_meeting_title: 'اجتماع', meeting_link_auto: false,
  report_teacher_edit_hours: 24, reporting_currency: 'SAR', renewal_alert_remaining: 2, subscription_expiry_days: 7,
  flag_future_lessons_when_unpaid: true, payout_count_late: false, payout_count_no_show: false,
  payout_count_trials: false, fx_fresh_hours: 24, upload_max_mb: 10, academy_whatsapp_e164: '+966566101447',
  academy_timezone: 'Asia/Riyadh', feedback_rate_window_min: 10, sales_auto_assign: true, renewal_commission_percent: 50,
  academy_contact: { site: 'ayatalbayan.com' }, recording_consent_notice: null, recording_retention_days: null,
  activity_retention_days: 180,
  family_login_enabled: false, login_code_ttl_minutes: 10, login_code_max_attempts: 5,
});

const surface: Record<string, unknown> = root;

describe('@ab/shared export surface (settings, custom config, integrations, google)', () => {
  it.each([...SETTINGS_NAMES, ...CUSTOM_CONFIG_NAMES, ...INTEGRATIONS_NAMES, ...GOOGLE_NAMES])('%s is exported', (name) => {
    expect(surface[name]).toBeDefined();
  });

  it('SETTING_DEFAULTS holds the 49 keys with today\'s values', () => {
    expect(Object.keys(DEFAULTS_LITERAL)).toHaveLength(49);
    expect(root.SETTING_KEYS).toHaveLength(49);
    expect(root.SETTING_DEFAULTS).toEqual(DEFAULTS_LITERAL);
  });

  it('the settings types keep their shape', () => {
    expectTypeOf<SettingKey>().toEqualTypeOf<keyof AcademySettings>();
    expectTypeOf<SettingField>().toEqualTypeOf<keyof SettingsUpdate>();
    expectTypeOf<FeedbackMode>().toEqualTypeOf<'buttons' | 'link'>();
    expectTypeOf<CamelKey<'reminder_24h_enabled'>>().toEqualTypeOf<'reminder24hEnabled'>();
    expectTypeOf<SettingValue<{ type: 'int'; nullable: true }>>().toEqualTypeOf<number | null>();
    expectTypeOf<SettingDef['type']>().toEqualTypeOf<
      'int' | 'bool' | 'string' | 'e164' | 'tz' | 'currency' | 'int_list' | 'enum' | 'json'
    >();
    expectTypeOf<JsonDef['shape']>().toEqualTypeOf<readonly ShapeField[]>();
    expectTypeOf<SettingsSectionId>().toEqualTypeOf<
      'messaging' | 'schedule' | 'classroom' | 'reports' | 'accounts' | 'uploads' | 'academy' | 'sales' | 'appearance'
    >();
    expectTypeOf<JoinWindowConfig>().toEqualTypeOf<{ opensBeforeMin: number; closesAfterMin: number }>();
  });

  it('the public and custom-config types keep their shape', () => {
    expectTypeOf<PublicSettingKey>().toEqualTypeOf<
      | 'academy_contact' | 'academy_whatsapp_e164' | 'join_closes_after_min' | 'join_opens_before_min'
      | 'makeup_window_days' | 'meeting_link_auto' | 'recording_consent_notice' | 'upload_max_mb'
    >();
    expectTypeOf<PublicSettings>().toEqualTypeOf<Pick<AcademySettings, PublicSettingKey>>();
    expectTypeOf<keyof PublicConfig>().toEqualTypeOf<PublicSettingKey | 'custom'>();
    expectTypeOf<keyof CustomConfigView>().toEqualTypeOf<'key' | 'value' | 'description' | 'isPublic' | 'updatedAt' | 'updatedBy'>();
    expectTypeOf<CustomConfigUpsert['isPublic']>().toEqualTypeOf<boolean>();
  });

  it.each(NEW_NAMES)('%s is added', (name) => {
    expect(surface[name]).toBeDefined();
  });

  it('the settings meta types describe GET /config/meta', () => {
    expectTypeOf<SettingMeta>().toEqualTypeOf<{ updatedAt: string; updatedBy: string | null; updatedByName: string | null }>();
    expectTypeOf<SettingsMetaResponse['meta']>().toEqualTypeOf<Record<string, SettingMeta>>();
  });

  it('the integrations and google types are still exported', () => {
    expectTypeOf<IntegrationKey>().toBeString();
    expectTypeOf<IntegrationSecretKey>().toExtend<IntegrationKey>();
    expectTypeOf<GoogleSyncMode>().toBeString();
  });
});
