import type { SettingKey } from '@ab/shared';
import { useId } from 'react';
import { cn } from '@/lib/utils';

/** The ids that tie a row's label, bounds and error line to its editor. */
export interface RowIds {
  label: string;
  editor: string;
  bounds: string;
  error: string;
}

export function useRowIds(): RowIds {
  const id = useId();
  return { label: `${id}-label`, editor: `${id}-editor`, bounds: `${id}-bounds`, error: `${id}-error` };
}

export interface EditorProps {
  settingKey: SettingKey;
  ids: RowIds;
  /** In the phone sheet: full-size controls (16px, 44px); in the table: dense 32px ones. */
  sheet?: boolean;
}

/** aria-describedby from the ids that apply (undefined when none). */
export const describedBy = (...ids: (string | false | undefined)[]): string | undefined => {
  const list = ids.filter((id): id is string => typeof id === 'string' && id !== '');
  return list.length > 0 ? list.join(' ') : undefined;
};

/** Table editors are dense from 640px; the sheet keeps the stock 44px / 16px control. */
export const denseClass = (sheet: boolean | undefined, width: string): string =>
  cn(sheet ? 'w-full' : cn(width, 'sm:h-8 sm:min-h-8'));
