import type { ChannelMessageKind } from '@ab/shared';
import type { ComponentType } from 'react';
import { MicIcon } from '../../../chat-ui/icons/chat-glyphs';
import { DocumentIcon, GalleryIcon } from '../../../chat-ui/icons/composer-icons';
import type { ChatIconProps } from '../../../chat-ui/icons/icon-line';

/** Each file kind's drawn icon in a quote (ChatXReply); a text has none. */
export const ICONS: Readonly<Record<ChannelMessageKind, ComponentType<ChatIconProps> | null>> = {
  text: null,
  photo: GalleryIcon,
  pdf: DocumentIcon,
  voice: MicIcon,
};
