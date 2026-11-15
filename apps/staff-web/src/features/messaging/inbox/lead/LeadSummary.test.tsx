import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { lead } from '@/features/messaging/inbox/testing/inbox-fixture';
import { LeadSummary } from './LeadSummary';

describe('LeadSummary: «بيانات الطالب» at a glance', () => {
  it('a titled region; nothing filled → «لا توجد بيانات بعد»', () => {
    render(<LeadSummary lead={lead()} />);
    const card = within(screen.getByRole('region', { name: t.leads.qualification }));
    expect(card.getByText(t.inbox.noLeadData)).toBeTruthy();
    expect(card.queryByRole('term')).toBeNull();
  });

  it('label/value pairs for the filled facts only', () => {
    render(<LeadSummary lead={lead({ qualification: { student_name: 'سهيلة', age: 9 } })} />);
    const terms = screen.getAllByRole('term').map((el) => el.textContent);
    expect(terms).toEqual([t.leads.studentName, t.leads.studentAge]);
    expect(screen.getAllByRole('definition').map((el) => el.textContent)).toEqual(['سهيلة', '9']);
    expect(screen.queryByText(t.inbox.noLeadData)).toBeNull();
  });
});
