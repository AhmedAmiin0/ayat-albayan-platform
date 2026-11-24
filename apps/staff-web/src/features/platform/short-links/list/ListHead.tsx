import { counted } from '@ab/core';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { t } from '@ab/web-kit/lib/i18n/i18n';

interface ListHeadProps {
  /** Links under the filters; unknown while the first page loads. */
  total: number | undefined;
  onNew: () => void;
}

export function ListHead({ total, onNew }: ListHeadProps) {
  return (
    <>
      <PageHead className="mb-2">
        <Cartouche>{t.shortLinks.title}</Cartouche>
        {total !== undefined && (
          <span className="text-sm text-ink-3 tabular-nums">
            {counted(t.shortLinks.list.count, total)}
          </span>
        )}
        <div className="ms-auto">
          <Button onClick={onNew}>
            <Icon name="plus" />
            {t.shortLinks.new}
          </Button>
        </div>
      </PageHead>
      <p className="mb-5 max-w-[80ch] text-sm text-ink-2">{t.shortLinks.intro}</p>
    </>
  );
}
