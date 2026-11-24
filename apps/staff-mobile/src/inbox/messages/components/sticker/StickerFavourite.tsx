import { isStickerMessage, type MessageView } from '@ab/shared';
import { t, Button } from '@ab/mobile-kit';
import { useStickerFavourite } from '@/inbox/composer/emoji/panel-api';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';

interface StickerFavouriteProps {
  message: MessageView;
  onClose: () => void;
}

/** The button, once the bubble is a sticker: its state comes from the panel's list. */
function FavouriteButton({ message, onClose }: StickerFavouriteProps) {
  const { saved, toggle } = useStickerFavourite(message);
  return (
    <Button
      variant="secondary"
      label={saved ? t.inbox.sticker.unfavourite : t.inbox.sticker.favourite}
      onPress={() => {
        toggle.mutate();
        onClose();
      }}
    />
  );
}

/** Kept per staff member; never in teacher mode. */
export function StickerFavourite({ message, onClose }: StickerFavouriteProps) {
  const teacher = useThreadMode().kind === 'teacher';
  if (teacher || message.hidden || !isStickerMessage(message)) return null;
  return <FavouriteButton message={message} onClose={onClose} />;
}
