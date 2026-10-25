import { DESCRIPTION_MAX } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { settingText } from '@/components/settings/search/setting-text';
import { t } from '@/lib/i18n/i18n';
import { entryOf } from '@/test/entries-fixture';
import { findRow, renderValues } from './values-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const granted = vi.hoisted(() => ({ perms: new Set<string>(['settings.write']) }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: (p: string) => granted.perms.has(p) }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/inbox/testing/test-utils')).MockLink }));

const d = t.settingsValues.describe;
const HORIZON = t.settings.bookingHorizonWeeks;
const MINE = 'عدد الأسابيع التي تظهر فيها الحلقات مسبقًا.';
const edited = entryOf('booking_horizon_weeks', { description: MINE, descriptionEdited: true });
const counter = (n: number) => d.count.replace('{n}', String(n)).replace('{max}', String(DESCRIPTION_MAX));

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  granted.perms = new Set(['settings.write']);
});

// The line's name is its text, then the sr-only «. اقرأ الوصف كاملًا أو عدّله» (the visible text alone says no action).
const openLine = async (label: string, text: string) => fireEvent.click(within(await findRow(label)).getByRole('button', { name: `${text}${d.lineSr}` }));

describe('«القيم» — «تعديل الوصف»', () => {
  it('the muted line opens the editor: labelled textarea, live counter, «احفظ الوصف» sends PUT and announces', async () => {
    apiSend.mockImplementation(async () => ({ entry: { ...edited, description: 'وصف أوضح' } }));
    renderValues(apiFetch, { entries: [edited] });
    await openLine(HORIZON, MINE);
    const dialog = screen.getByRole('dialog', { name: d.title });
    const box = within(dialog).getByLabelText(new RegExp(d.label)) as HTMLTextAreaElement;
    expect(box.value).toBe(MINE);
    expect(box.maxLength).toBe(DESCRIPTION_MAX);
    const hint = within(dialog).getByText(counter(MINE.length));
    expect(box.getAttribute('aria-describedby')).toContain(hint.id);
    fireEvent.change(box, { target: { value: 'وصف أوضح' } });
    expect(within(dialog).getByText(counter('وصف أوضح'.length))).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: d.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/config/entries/booking_horizon_weeks/description', { text: 'وصف أوضح' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText(d.saved).getAttribute('aria-live')).toBe('polite');
  });

  it('an empty text is never sent; «أعد الوصف الأصلي» (only once edited) sends null', async () => {
    apiSend.mockImplementation(async () => ({ entry: { ...edited, description: null, descriptionEdited: false } }));
    renderValues(apiFetch, { entries: [edited] });
    await openLine(HORIZON, MINE);
    const dialog = screen.getByRole('dialog', { name: d.title });
    fireEvent.change(within(dialog).getByLabelText(new RegExp(d.label)), { target: { value: '   ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: d.save }));
    expect(within(dialog).getByText(d.required)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: d.restore }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/config/entries/booking_horizon_weeks/description', { text: null }));
    await screen.findByText(d.restored);
  });

  it('a seeded description has no «أعد الوصف الأصلي»; the row menu «اقرأ الوصف وعدّله» opens the same editor', async () => {
    renderValues(apiFetch);
    const row = await findRow(HORIZON);
    fireEvent.click(within(row).getByRole('button', { name: t.settingsValues.menu.replace('{name}', HORIZON) }));
    fireEvent.click(within(row).getByRole('menuitem', { name: d.menu }));
    const dialog = screen.getByRole('dialog', { name: d.title });
    expect((within(dialog).getByLabelText(new RegExp(d.label)) as HTMLTextAreaElement).value).toBe(settingText('booking_horizon_weeks').hint);
    expect(within(dialog).queryByRole('button', { name: d.restore })).toBeNull();
  });

  it('without settings.write the line opens the text to read: no editor, the key for developers', async () => {
    granted.perms = new Set();
    renderValues(apiFetch, { entries: [edited] });
    await openLine(HORIZON, MINE);
    const dialog = screen.getByRole('dialog', { name: d.readTitle });
    expect(within(dialog).getByText(MINE)).toBeTruthy();
    expect(within(dialog).queryByRole('textbox')).toBeNull();
    expect(within(dialog).getByText('booking_horizon_weeks')).toBeTruthy();
  });

  it('owned rows: the gate keys need settings.write, «comms_source» needs numbers.manage', async () => {
    const gate = entryOf('messaging_enabled', { description: 'وصف البوابة' });
    const comms = entryOf('comms_source', { description: 'وصف المصدر' });
    renderValues(apiFetch, { search: { group: 'sending' }, entries: [gate, comms] });
    await openLine(settingText('messaging_enabled').label, 'وصف البوابة');
    expect(screen.getByRole('dialog', { name: d.title })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    await openLine(settingText('comms_source').label, 'وصف المصدر');
    const ro = screen.getByRole('dialog', { name: d.readTitle });
    expect(within(ro).getByText(d.readOnlyNote)).toBeTruthy();
    expect(within(ro).queryByRole('textbox')).toBeNull();
  });

  it('«comms_source» with numbers.manage opens the editor', async () => {
    granted.perms = new Set(['numbers.manage']);
    renderValues(apiFetch, { search: { group: 'sending' }, entries: [entryOf('comms_source', { description: 'وصف المصدر' })] });
    await openLine(settingText('comms_source').label, 'وصف المصدر');
    expect(screen.getByRole('dialog', { name: d.title })).toBeTruthy();
  });
});
