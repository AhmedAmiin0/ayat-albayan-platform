import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clearTabMemories } from '@/features/messaging/inbox/shared/tab-memory';
import {
  box,
  editBar,
  editButton,
  openMenu,
  OWN,
  pickEdit,
  showChat,
} from '@/features/messaging/inbox/testing/correction-harness';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { ADMIN } from './hide.testing';

afterEach(() => clearTabMemories());

const THEIRS_STAFF = { ...OWN, sent_by_id: 'p2' };

describe('«تعديل» in the bubble menu (owner 2026-11-07)', () => {
  it('her own sent text: «تعديل» is on, without the «cannot edit» note', () => {
    showChat();
    openMenu();
    expect(editButton().getAttribute('aria-disabled')).toBeNull();
    expect(screen.queryByText(t.inbox.hide.noEdit)).toBeNull();
  });

  it('a pick opens the box with the original text as is, focused, under the edit bar', () => {
    showChat();
    pickEdit();
    expect(editBar()).toBeTruthy();
    expect(box().value).toBe(OWN.body);
    expect(document.activeElement).toBe(box());
  });

  it('a colleague’s text for sales: «تعديل» off, with why; a pick does nothing', () => {
    showChat([THEIRS_STAFF]);
    openMenu();
    const edit = editButton();
    expect(edit.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText(t.inbox.hide.noEdit)).toBeTruthy();
    edit.click();
    expect(editBar()).toBeNull();
  });

  it('the admin corrects a colleague’s text', () => {
    showChat([THEIRS_STAFF], ADMIN);
    pickEdit();
    expect(editBar()).toBeTruthy();
  });

  it('theirs: no «تعديل» at all', () => {
    showChat([message({ id: 'in', body: 'السلام عليكم', replyable: true, forwardable: true })]);
    openMenu();
    expect(screen.queryByRole('button', { name: t.inbox.correction.action })).toBeNull();
  });
});
