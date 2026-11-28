/** DOM id of a /admin/settings section (`settings-<id>`; heading `settings-<id>-title`). */
export const sectionId = (s: string) => `settings-${s}`;

/** A section of /admin/settings as the index lists it: its id and its title. */
export interface SettingsPageSection {
  id: string;
  label: string;
}
