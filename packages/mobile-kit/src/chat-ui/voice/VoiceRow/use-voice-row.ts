import { t } from '../../../lib/i18n/i18n';
import { useSmallText } from '../../bubble/use-small-text';
import type { VoiceRowProps } from './VoiceRow.types';

export function useVoiceRow(p: VoiceRowProps) {
  const small = useSmallText();
  const label = p.playing ? t.inbox.pauseMedia : t.inbox.playMedia.replace('{kind}', p.kind);
  return { small, label };
}
