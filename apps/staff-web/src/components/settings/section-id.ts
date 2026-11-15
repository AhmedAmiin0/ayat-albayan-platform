/** The DOM id of a section of /admin/settings (`settings-<id>`; its heading is `settings-<id>-title`). */
export const sectionId = (s: string) => `settings-${s}`;

/** A section of /admin/settings as the index lists it: its id and its title. */
export interface SettingsPageSection {
  id: string;
  label: string;
}
