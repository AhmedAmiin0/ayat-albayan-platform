import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { EmojiGrid } from './EmojiGrid';
import type { PanelMedia } from './panel-api';
import { GifTab } from './GifTab';
import { StickerTab } from './StickerTab';

// The emoji panel's tabs as WhatsApp (owner 2026-11-01): Emoji | GIF | Stickers, staff only.

export type PanelTab = 'emoji' | 'gif' | 'stickers';

const TABS: readonly PanelTab[] = ['emoji', 'gif', 'stickers'];

export function PanelTabs({ tab, onTab }: { tab: PanelTab; onTab: (tab: PanelTab) => void }) {
  const items = TABS.map((value) => ({ value, label: t.inbox.composer.tabs[value] }));
  const label = t.inbox.composer.emoji;
  return (
    <FilterPills items={items} value={tab} onChange={onTab} accessibilityLabel={label} role="tablist" wrap />
  );
}

interface BodyProps {
  tab: PanelTab;
  onPick: (emoji: string) => void;
  media: PanelMedia | undefined;
  /** A GIF or a sticker went: the sheet closes. */
  onSent: () => void;
}

interface TabProps {
  onPick: (emoji: string) => void;
  media: PanelMedia;
  onSent: () => void;
}

type TabBody = (p: TabProps) => ReactNode;

const BODIES: Record<PanelTab, TabBody> = {
  emoji: ({ onPick }) => <EmojiGrid onPick={onPick} />,
  gif: ({ media, onSent }) => <GifTab media={media} onSent={onSent} />,
  stickers: ({ media, onSent }) => <StickerTab media={media} onSent={onSent} />,
};

/** The open tab; without `media` (a teacher, a closed window) the emoji alone, as before. */
export function PanelBody({ tab, media, onPick, onSent }: BodyProps) {
  if (!media) return <EmojiGrid onPick={onPick} />;
  return <View style={{ flex: 1 }}>{BODIES[tab]({ onPick, media, onSent })}</View>;
}
