import type { ChannelMessageKind } from '@ab/shared';
import type { ComponentType } from 'react';
import { MicIcon } from '../../../chat-ui/icons/chat-glyphs';
import { DocumentIcon, GalleryIcon } from '../../../chat-ui/icons/composer-icons';
import type { ChatIconProps } from '../../../chat-ui/icons/icon-line';
import { useTheme } from '../../../theme';

/** Each file kind's drawn icon in a quote (ChatXReply); a text has none. */
const ICONS: Readonly<Record<ChannelMessageKind, ComponentType<ChatIconProps> | null>> = {
  text: null,
  photo: GalleryIcon,
  pdf: DocumentIcon,
  voice: MicIcon,
};

/** A quoted file's icon before its kind word: 14pt, ink-3; nothing for a text or a deleted one. */
export function QuoteGlyph({ kind, deleted }: { kind: ChannelMessageKind; deleted: boolean }) {
  const { color } = useTheme();
  const Icon = deleted ? null : ICONS[kind];
  return Icon ? <Icon color={color.ink3} size={14} /> : null;
}
