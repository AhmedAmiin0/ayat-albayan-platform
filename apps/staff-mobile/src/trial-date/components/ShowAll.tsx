import { t, Button } from '@ab/mobile-kit';
import { HISTORY_CAP } from '@/trial-date/lib/history-cap';

interface ShowAllProps {
  total: number;
  all: boolean;
  onToggle: () => void;
}

/** Full width, never a shrink-wrapped multi-word button (docs/07 §6). */
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
