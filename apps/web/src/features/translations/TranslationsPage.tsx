import type { TranslationKeyRow } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Cartouche } from '@/components/ui/display/cartouche';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { PageHead } from '@/components/ui/layout/page';
import { Pager } from '@/components/ui/layout/pager';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { TranslationEditor } from './TranslationEditor';
import { translationColumns } from './translationColumns';
import { translationKeysQuery, type TranslationsSearch } from './translations.api';

/**
 * «الترجمات» (owner, 2026-10-05): every text of the interface, Arabic and English side by side,
 * the edited ones marked «معدّل». A row opens the editor; edits apply on the next page load.
 */
export function TranslationsPage() {
  const [search, setSearch] = useState<TranslationsSearch>({ search: '', section: '', page: 1 });
  const [editing, setEditing] = useState<TranslationKeyRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const keys = useQuery(translationKeysQuery(search));
  const data = keys.data;
  return (
    <>
      <PageHead>
        <Cartouche>{t.translations.title}</Cartouche>
        {data && <span className="text-sm text-ink-3 tabular-nums">{t.translations.count.replace('{n}', String(data.total))}</span>}
      </PageHead>
      <p className="mb-1 text-sm text-ink-2">{t.translations.intro}</p>
      <p className="mb-4 text-sm text-ink-3">{t.translations.applyNote}</p>
      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label={t.translations.search}>
          {(p) => <Input {...p} type="search" value={search.search} onChange={(e) => setSearch({ ...search, search: e.target.value, page: 1 })} />}
        </Field>
        <Field label={t.translations.section}>
          {(p) => (
            <Select {...p} value={search.section} onChange={(e) => setSearch({ ...search, section: e.target.value, page: 1 })}>
              <option value="">{t.translations.allSections}</option>
              {(data?.sections ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {notice && <p role="status" className="mb-3 text-sm text-ok">{notice}</p>}
      {keys.isError && <p role="alert">{t.common.error}</p>}
      {keys.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {data && (
        <>
          <DataTable
            fill
            stacked
            columns={translationColumns}
            data={data.items}
            getRowId={(r) => r.key}
            onRowClick={setEditing}
            emptyText={t.translations.empty}
          />
          <Pager page={search.page} total={data.total} pageSize={data.pageSize} onPage={(page) => setSearch({ ...search, page })} />
        </>
      )}
      {editing && <TranslationEditor row={editing} onClose={() => setEditing(null)} onDone={setNotice} />}
    </>
  );
}
