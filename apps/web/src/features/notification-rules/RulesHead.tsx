import { counted } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n';

const r = t.notificationRules;

export interface RulesHeadProps {
  canManage: boolean;
  /** Rows with an unsaved draft (any audience tab). */
  unsaved: number;
  /** Shows the audience tab of the first unsaved row. */
  onUnsaved: () => void;
}

/**
 * The head of «الإشعارات»: the title, «للاطلاع فقط» without notifications.manage, and — like the
 * head of «القيم» (docs/26b §2 «Dirty») — the count «إشعاران لم يُحفظا» that leads to the first one.
 */
export function RulesHead({ canManage, unsaved, onUnsaved }: RulesHeadProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h3 id="notification-rules-title" className="text-sm font-bold">
        {r.title}
      </h3>
      {!canManage && <span className="rounded-sm border border-rule px-1.5 text-2xs text-ink-3">{r.readOnly}</span>}
      {unsaved > 0 && (
        <button
          type="button"
          onClick={onUnsaved}
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-lapis underline underline-offset-4 sm:min-h-0"
        >
          <NuqtaGlyph shape="hollow" />
          {counted(r.unsavedCount, unsaved)}
        </button>
      )}
    </div>
  );
}
