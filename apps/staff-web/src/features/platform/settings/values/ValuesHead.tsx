import { counted } from '@ab/core';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { Tag } from './cells/NameCell';

const v = t.settingsValues;

export interface ValuesHeadProps {
  canWrite: boolean;
  counts?: { total: number; modified: number; public: number } | undefined;
  /** Rows with an unsaved edit (desktop); a click shows the group of the first one. */
  unsaved: number;
  onUnsaved: () => void;
  onAdd: () => void;
  phone: boolean;
}

export function ValuesHead({ canWrite, counts, unsaved, onUnsaved, onAdd, phone }: ValuesHeadProps) {
  const summary =
    counts &&
    v.summary
      .replace('{total}', counted(v.count, counts.total))
      .replace('{modified}', String(counts.modified))
      .replace('{public}', String(counts.public));
  return (
    <>
      <PageHead className="mb-3">
        <Cartouche>{v.title}</Cartouche>
        {!canWrite && <Tag label={v.readOnly} />}
        {summary && <span className="text-sm text-ink-3">{summary}</span>}
        {!phone && unsaved > 0 && (
          <button type="button" onClick={onUnsaved} className="inline-flex items-center gap-1.5 text-sm font-semibold text-lapis underline underline-offset-4">
            <NuqtaGlyph shape="hollow" />
            {counted(v.unsaved, unsaved)}
          </button>
        )}
        {canWrite && (
          <div className="ms-auto">
            <Button variant="secondary" onClick={onAdd}>
              <Icon name="plus" />
              {t.config.custom.add}
            </Button>
          </div>
        )}
      </PageHead>
      {/* Desktop: the tag says it. Phones also get the sentence, under the head. */}
      {!canWrite && phone && <p className="mb-4 rounded-md bg-sunk px-3 py-2 text-sm text-ink-2">{v.readOnlyNote}</p>}
    </>
  );
}
