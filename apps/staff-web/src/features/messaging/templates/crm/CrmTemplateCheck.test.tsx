import type { TemplateView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { templatesQuery } from '@/features/messaging/templates/api';
import { templateName } from '@/features/messaging/templates/template-cells';
import { t } from '@/lib/i18n/i18n';
import { CrmTemplateCheck } from './CrmTemplateCheck';

// «تحقق من القالب» (owner 2026-10-31): a crm number lists the templates Meta refused with #132001.

const s = t.templates.crmCheck;
const REFUSED = 'Meta API error: (#132001) Template name does not exist in the translation';

function renderWith(rows: TemplateView[] | undefined) {
  const client = new QueryClient();
  if (rows) client.setQueryData(templatesQuery.queryKey, rows);
  render(
    <QueryClientProvider client={client}>
      <CrmTemplateCheck line="notifications" />
    </QueryClientProvider>,
  );
}

describe('CrmTemplateCheck', () => {
  it('lists this number’s missing templates with the CRM’s words, and how to fix one', () => {
    renderWith([
      template({ key: 'teacher_new_student', meta_name: 'teacher_new_student', status: 'missing', last_error: REFUSED }),
      template({ key: 'renewal_due', meta_name: 'renewal_due', status: 'approved' }),
      template({ key: 'welcome_greeting', meta_name: 'welcome_greeting', status: 'missing', line: 'chat' }),
    ]);
    expect(screen.getByText(s.missing.replace('{count}', '1'))).toBeTruthy();
    const item = s.item.replace('{name}', templateName('teacher_new_student')).replace('{meta}', 'teacher_new_student');
    expect(screen.getByText(item)).toBeTruthy();
    expect(screen.getByText(REFUSED)).toBeTruthy();
    expect(screen.getByText(s.fix)).toBeTruthy();
    expect(screen.queryByText(templateName('renewal_due'), { exact: false })).toBeNull();
  });

  it('none missing on this number says so', () => {
    renderWith([template({ status: 'approved' })]);
    expect(screen.getByText(s.none)).toBeTruthy();
  });

  it('reads nothing itself: without the table’s copy it shows the explanation only', () => {
    renderWith(undefined);
    expect(screen.getByText(s.intro)).toBeTruthy();
    expect(screen.queryByText(s.none)).toBeNull();
  });
});
