import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { kid, lesson } from '@ab/web-kit/portal/portal.fixtures';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { FamilyChip } from '@ab/web-kit/portal/lessons/options/FamilyChip';
import { FamilyLine } from './FamilyLine';

const A = t.portal.actions;
const NOW = new Date('2026-10-26T10:00:00.000Z');
const who = { student: kid(), now: NOW };
const request = (status: 'pending' | 'rejected', decision_note: string | null = null) => ({
  id: 'r', status, proposed_starts_at: '2026-10-29T15:30:00.000Z', note: null, decision_note, decided_at: null,
});

describe('what the family asked, on the web card (owner 2026-11-17)', () => {
  it('waiting: the chip, what was asked, and that the time stays', () => {
    const l = lesson({ status: 'scheduled', family: { group: false, counts: false, request: request('pending') } });
    renderPortal(<><FamilyChip lesson={l} /><FamilyLine lesson={l} {...who} /></>);
    expect(screen.getByText(A.pendingChip)).toBeTruthy();
    expect(screen.getByText(/^طلبتم /)).toBeTruthy();
    expect(screen.getByText(A.staysNote)).toBeTruthy();
  });

  it('declined: «لم يُقبل الطلب» with the academy’s note', () => {
    const l = lesson({ family: { group: false, counts: false, request: request('rejected', 'لا يتوفر وقت') } });
    renderPortal(<FamilyLine lesson={l} {...who} />);
    expect(screen.getByText(`${A.rejectedChip} · ${A.decisionNote.replace('{note}', 'لا يتوفر وقت')}`)).toBeTruthy();
  });

  it('excused: whether it counts from the package', () => {
    renderPortal(<FamilyLine lesson={lesson({ status: 'excused', family: { group: false, counts: true, request: null } })} {...who} />);
    expect(screen.getByText(A.excusedYes)).toBeTruthy();
  });

  it('confirmed ahead: «أكّدتم حضور سلمى لهذه الحلقة»', () => {
    const confirmed = lesson({ family: { group: false, counts: false, request: null } });
    renderPortal(<FamilyLine lesson={confirmed} {...who} />);
    expect(screen.getByText(A.confirmedLine.replace('{student}', 'سلمى'))).toBeTruthy();
  });
});
