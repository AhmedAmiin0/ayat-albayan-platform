import { isLoaded } from 'expo-font';
import { t } from '../../../lib/i18n/i18n';
import { type } from '../../../theme';

export const S = t.crash;

export const TITLE = 22;

export const BODY = type.size.body;

/** A crash in the root layout can come before Noto Sans Arabic is registered (iOS rejects it). */
export const font = (family: string) => (isLoaded(family) ? family : undefined);
