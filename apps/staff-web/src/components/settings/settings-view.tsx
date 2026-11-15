import type { SettingMeta } from '@ab/shared';
import { createContext, useContext } from 'react';

/** What every section needs besides the form: the search text and who last changed each setting. */
export interface SettingsView {
  query: string;
  meta: Record<string, SettingMeta>;
}

const EMPTY: SettingsView = { query: '', meta: {} };

export const SettingsViewContext = createContext<SettingsView>(EMPTY);

/** Read inside any section (a plain render without the page gets «no search, no meta»). */
export const useSettingsView = (): SettingsView => useContext(SettingsViewContext);
