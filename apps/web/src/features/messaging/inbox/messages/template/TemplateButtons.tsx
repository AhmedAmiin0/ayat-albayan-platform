import { templateButtonLink, type TemplateDisplayButton } from '@ab/shared';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { templateButtonHint, templateButtonLabel } from '@ab/client-core';
import { BUTTON_ICON } from './template-buttons';

const words = t.inbox.templateBubble;

const ROW = 'flex min-h-11 w-full items-center justify-center gap-1.5 px-3 py-2 text-center text-sm font-semibold text-lapis';

function ButtonRow({ button: b }: { button: TemplateDisplayButton }) {
  const href = templateButtonLink(b);
  const hint = templateButtonHint(b, words);
  const inner = (
    <>
      <Icon name={BUTTON_ICON[b.type]} className="size-4" aria-hidden="true" />
      {/* Its own direction: an Arabic label in an English UI and back; long labels wrap, never clipped. */}
      <span dir="auto" className="min-w-0 [overflow-wrap:anywhere]">
        {templateButtonLabel(b, words)}
      </span>
    </>
  );
  return (
    <li className="border-t border-rule-strong first:border-t-0">
      {href ? (
        <a
          dir="auto"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={hint}
          aria-label={hint}
          className={`${ROW} hover:bg-lapis/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lapis`}
        >
          {inner}
        </a>
      ) : (
        <span dir="auto" title={hint} className={ROW}>
          <span aria-hidden="true" className="contents">
            {inner}
          </span>
          <span className="sr-only">{hint}</span>
        </span>
      )}
    </li>
  );
}

/**
 * The buttons right under a template's time, as WhatsApp draws them: full-width rows split by thin lines, each a
 * centred label after its icon. Display-only for ours (the family taps them in WhatsApp); a URL
 * button opens its link.
 */
export function TemplateButtons({ buttons }: { buttons: readonly TemplateDisplayButton[] }) {
  if (buttons.length === 0) return null;
  return (
    <ul aria-label={t.inbox.templateBubble.buttons} className="-mx-3.5 mt-2 border-t border-rule-strong">
      {buttons.map((b, i) => (
        <ButtonRow key={`${b.type}-${i}`} button={b} />
      ))}
    </ul>
  );
}
