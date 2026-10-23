/** Who last changed one settings row, and when (GET /config/meta, the «آخر تعديل» notes). */
export interface SettingMeta {
  updatedAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
}

/** GET /config/meta: one entry per stored settings row, by row key. */
export interface SettingsMetaResponse {
  meta: Record<string, SettingMeta>;
}
