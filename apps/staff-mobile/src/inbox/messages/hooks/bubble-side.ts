import { isStickerMessage, type MessageView } from '@ab/shared';
import type { ViewStyle } from 'react-native';

// Which side a bubble sits on is the kit's bubbleSide (BubbleShell); a sticker's bare box is here.

const BARE: ViewStyle = { borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0 };

/**
 * A sticker has no bubble around it, as WhatsApp: its time, ticks and
 * reactions stay. A teacher, whom the API refuses the file, keeps the bubble and its label.
 */
export const stickerBubble = (
  m: Pick<MessageView, 'media_mime' | 'interactive_payload'>,
  teacher: boolean,
): ViewStyle => (!teacher && isStickerMessage(m) ? BARE : {});
