import { SHORT_LINK_DEFAULT_DAYS, type LinkExpiry } from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { useState } from 'react';
import { t, Button, ErrorLine, Note } from '@ab/mobile-kit';
import { ExpiryField } from '@/short-links/ui/ExpiryField';
import { errorText } from '@/short-links/ui/link-words';
import { Sheet } from '@/short-links/ui/Sheet';
import { usePatchLink } from './use-patch-link';

interface ExtendSheetProps {
  link: Pick<ShortLinkDetail, 'code'>;
  onClose: () => void;
}

const D = () => t.shortLinks.detail;

/** An expired link runs again until the new lifetime ends. */
export function ExtendSheet({ link, onClose }: ExtendSheetProps) {
  const [expiry, setExpiry] = useState<LinkExpiry>({ kind: 'days', days: SHORT_LINK_DEFAULT_DAYS });
  const patch = usePatchLink(link.code, onClose);
  const formError = errorText(patch.errors, 'form');
  return (
    <Sheet
      title={D().extendTitle}
      testID="extend-sheet"
      onClose={onClose}
      footer={<Button label={D().save} onPress={() => patch.save({ expiry })} busy={patch.busy} />}
    >
      <Note>{D().extendHint}</Note>
      <ExpiryField
        expiry={expiry}
        onChange={setExpiry}
        error={errorText(patch.errors, 'expiresAt')}
      />
      {formError ? <ErrorLine message={formError} /> : null}
    </Sheet>
  );
}
