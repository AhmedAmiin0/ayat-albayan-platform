import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { OtherTimeProps } from './OtherTime.types';
import { OtherTimeList } from './OtherTimeList';

/** Every start of the server's next two weeks. */
export function OtherTime(props: OtherTimeProps) {
  const [open, setOpen] = useState(false);
  return (
    <section className="grid gap-3">
      <Button
        type="button"
        variant="secondary"
        className="justify-self-start"
        onClick={() => setOpen(!open)}
      >
        {open ? t.booking.otherTimeHide : t.booking.otherTime}
      </Button>
      {open ? <OtherTimeList {...props} /> : null}
    </section>
  );
}
