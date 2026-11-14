import { applyStrings, type FlatStrings, type Locale } from '@ab/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { env } from '../http/env';
import { t } from './i18n';
import { locale } from './locale';

// Dynamic translations on the phone (no editor here). At start: the overrides saved by the last
// run are written into `t` before the first screen (AsyncStorage, no network wait); then
// GET /i18n/:locale/overrides runs in the background (≤ 1.5 s) and saves the fresh map for the
// next start. Strings already copied into module constants pick up an edit on the next start.

export const OVERRIDES_TIMEOUT_MS = 1500;
export const cacheKey = (l: Locale): string => `ab.i18n.overrides.${l}`;

function asStrings(body: unknown): FlatStrings | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
  return Object.fromEntries(Object.entries(body).filter((e): e is [string, string] => typeof e[1] === 'string'));
}

/** The saved map of the last run; {} when nothing (or nothing readable) is saved. */
export async function restoreCachedOverrides(target: object, l: Locale): Promise<number> {
  try {
    return applyStrings(target, asStrings(JSON.parse((await AsyncStorage.getItem(cacheKey(l))) ?? '{}')) ?? {});
  } catch {
    return 0;
  }
}

/** The server's map, or null on timeout, network error, non-2xx or a malformed body. */
export async function fetchOverrides(apiUrl: string, l: Locale): Promise<FlatStrings | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OVERRIDES_TIMEOUT_MS);
  try {
    const res = await fetch(`${apiUrl}/i18n/${l}/overrides`, { signal: ctrl.signal });
    return res.ok ? asStrings(await res.json()) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetches, applies and saves the map for the next start; false when the server was not reached. */
export async function refreshOverrides(target: object, l: Locale): Promise<boolean> {
  const fresh = await fetchOverrides(env.apiUrl, l);
  if (fresh === null) return false;
  applyStrings(target, fresh);
  await AsyncStorage.setItem(cacheKey(l), JSON.stringify(fresh)).catch(() => undefined);
  return true;
}

/** Root-layout gate: true once the saved overrides are in `t`; the network refresh never blocks. */
export function useOverridesReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void restoreCachedOverrides(t, locale).then(() => {
      setReady(true);
      void refreshOverrides(t, locale);
    });
  }, []);
  return ready;
}
