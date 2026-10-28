import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { HISTORY_CAP } from '../lib/history-cap';

interface ShowAllProps {
  total: number;
  all: boolean;
  onToggle: () => void;
}

/**
 * «عرض الكل ({n})» / «عرض أقل» under a history longer than its first rows; nothing otherwise. Full
 * width: never a shrink-wrapped multi-word button (docs/07 §6).
 */
export function ShowAll({ total, all, onToggle }: ShowAllProps) {
  if (total <= HISTORY_CAP) return null;
  return (
    <Button
      variant="ghost"
      label={all ? t.trialDate.mobile.showLess : t.trialDate.mobile.showAll.replace('{n}', String(total))}
      onPress={onToggle}
    />
  );
}
