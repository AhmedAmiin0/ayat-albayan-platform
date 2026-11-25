import type { AuthorTemplate } from '@ab/client-core';
import { authorMayEdit, isCodeBound } from '@ab/shared';
import { Ltr, StatusChip, Button, t } from '@ab/web-kit';
import { AUTHOR_STATUS_STYLE, authorStatus } from './author-status';

const S = t.templates.author;

export interface AuthorTemplateCardProps {
  tpl: AuthorTemplate;
  /** The signed-in user (their own templates say so). */
  me: string | undefined;
  onEdit: (tpl: AuthorTemplate) => void;
}

export function AuthorTemplateCard({ tpl, me, onEdit }: AuthorTemplateCardProps) {
  const status = authorStatus(tpl.status);
  const mine = me !== undefined && tpl.created_by === me;
  return (
    <li className="grid gap-2 rounded-lg border border-rule bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Ltr className="font-semibold text-ink">{tpl.key}</Ltr>
        <StatusChip size="sm" {...AUTHOR_STATUS_STYLE[status]} label={S.status[status]} />
        {mine && <span className="text-2xs font-semibold text-ink-3">{S.mine}</span>}
        {isCodeBound(tpl.key) && <span className="text-2xs text-ink-3">{S.codeBound}</span>}
      </div>
      {status === 'rejected' && tpl.last_error && (
        <p className="text-xs text-danger">{S.rejectedReason.replace('{reason}', tpl.last_error)}</p>
      )}
      <p dir="auto" className="line-clamp-4 whitespace-pre-wrap text-sm text-ink-2 [overflow-wrap:anywhere]">
        {tpl.body_ar}
      </p>
      {authorMayEdit(tpl, me) && (
        <Button
          size="sm"
          variant="secondary"
          className="min-h-11 justify-self-start"
          aria-label={t.templates.edit.openFor.replace('{name}', tpl.key)}
          onClick={() => onEdit(tpl)}
        >
          {t.templates.edit.open}
        </Button>
      )}
    </li>
  );
}
