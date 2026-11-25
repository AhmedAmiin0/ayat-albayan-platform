import { t } from '@ab/web-kit';
import type { RowMenuItem } from '@/features/platform/settings/values/sheet/RowMenu';

const v = t.settingsValues;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The key is never a visible line in the row, only in the menu (docs/26b §2). */
export function keyItem(key: string, announce: (message: string) => void): RowMenuItem {
  return {
    id: 'copy-key',
    label: v.copyKey,
    detail: (
      <>
        {v.devKey}{' '}
        <bdi dir="ltr" className="font-mono">
          {key}
        </bdi>
      </>
    ),
    onSelect: () => {
      void copyText(key).then((ok) => {
        if (ok) announce(v.copied);
      });
    },
  };
}
