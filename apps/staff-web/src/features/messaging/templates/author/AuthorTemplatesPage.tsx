import type { TemplateView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche, Button, PageHead, Toast, t } from '@ab/web-kit';
import { meQuery } from '@/features/people/auth';
import { EditTemplateDialog } from '@/features/messaging/templates/edit/EditTemplateDialog';
import { AuthorTemplateCard } from './AuthorTemplateCard';
import { NewAuthorTemplateDialog } from './NewAuthorTemplateDialog';
import { useAuthoredTemplates } from './use-author-templates';

const S = t.templates.author;

type ListShape = Pick<ReturnType<typeof useAuthoredTemplates>, 'isError' | 'isPending' | 'data'>;

/** Loading, failed, or empty: the one line above the cards. */
function ListState({ list }: { list: ListShape }) {
  if (list.isError) return <p role="alert">{S.loadError}</p>;
  if (list.isPending) return <p className="text-sm text-ink-3">{t.common.loading}</p>;
  return list.data?.length ? null : <p className="text-sm text-ink-3">{S.empty}</p>;
}

/** One column of cards so it reads the same at 390px. */
export function AuthorTemplatesPage() {
  const list = useAuthoredTemplates();
  const me = useQuery(meQuery).data?.id;
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TemplateView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const done = (text: string) => (tpl: TemplateView) => {
    setCreating(false);
    setEditing(null);
    setNotice(text.replace('{name}', tpl.key));
  };
  const rows = list.data ?? [];
  return (
    <>
      <PageHead>
        <Cartouche>{S.title}</Cartouche>
        <div className="ms-auto">
          <Button className="min-h-11" onClick={() => setCreating(true)}>
            {S.new}
          </Button>
        </div>
      </PageHead>
      <div className="grid max-w-3xl gap-4">
      <p className="max-w-[70ch] text-sm text-ink-2">{S.intro}</p>
      <ListState list={list} />
      <ul className="grid gap-3">
        {rows.map((tpl) => (
          <AuthorTemplateCard key={tpl.key} tpl={tpl} me={me} onEdit={setEditing} />
        ))}
      </ul>
      {creating && (
        <NewAuthorTemplateDialog onCreated={done(S.submitted)} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <EditTemplateDialog
          tpl={editing}
          mode="author"
          onSaved={done(t.templates.edit.saved)}
          onClose={() => setEditing(null)}
        />
      )}
      </div>
      {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}
