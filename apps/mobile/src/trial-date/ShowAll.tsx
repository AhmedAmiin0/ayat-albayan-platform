import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { HISTORY_CAP } from './history-cap';

export interface ShowAllProps {
  total: number;
  all: boolean;
  onToggle: () => void;
}

/** «عرض الكل ({n})» / «عرض أقل» under a history longer than its first rows; nothing otherwise. */
export function ShowAll({ total, all, onToggle }: ShowAllProps) {
  if (total <= HISTORY_CAP) return null;
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <Button
        variant="ghost"
        label={all ? t.trialDate.mobile.showLess : t.trialDate.mobile.showAll.replace('{n}', String(total))}
        onPress={onToggle}
      />
    </View>
  );
}
