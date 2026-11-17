import { t } from '../../lib/i18n/i18n';
import { MenuSheet } from '../../ui/feedback/MenuSheet';
import { Button } from '../../ui/primitives/Button';

interface AttachSheetProps {
  open: boolean;
  /** Each source the app's port offers; absent → no row. */
  photo?: () => void;
  pdf?: () => void;
  onClose: () => void;
}

/** «إرفاق ملف» (ChatXAttach): a photo or a PDF, then the picker of the app. */
export function AttachSheet({ open, photo, pdf, onClose }: AttachSheetProps) {
  const m = t.studentChannel.media;
  const run = (action: () => void) => () => {
    onClose();
    action();
  };
  return (
    <MenuSheet open={open} label={m.attach} testID="channel-attach" onClose={onClose}>
      {photo ? <Button variant="secondary" label={m.photo} onPress={run(photo)} /> : null}
      {pdf ? <Button variant="secondary" label={m.pdf} onPress={run(pdf)} /> : null}
      <Button variant="ghost" label={m.cancel} onPress={onClose} />
    </MenuSheet>
  );
}
