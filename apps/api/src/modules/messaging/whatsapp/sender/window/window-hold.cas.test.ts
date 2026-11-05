import { beforeEach, describe, expect, it } from 'vitest';
import { NOW, staffText, windowFakes } from './window.fakes';

// Review of #629: every hold write is compare-and-set on the error_code the worker read, so a
// row another worker released (and is sending) is never held or failed again. Fakes only.

let f = windowFakes();
const at = (row = staffText()) => ({ row, now: NOW, line: 'chat' as const });
const until = new Date(Date.parse('2026-11-03T07:59:00Z') + 7 * 24 * 3_600_000);

describe('WindowHold — compare-and-set on what the worker read', () => {
  beforeEach(() => {
    f = windowFakes();
  });

  it('after a refused claim the hold and its failures expect SENDING, never a fresh marker', async () => {
    await f.hold.closed(at(staffText({ error_code: null })));
    expect(f.repo.hold).toHaveBeenCalledWith(expect.objectContaining({ from: 'sending' }));
    f.settings.read.mockResolvedValue({ chat_reopen_template: '' });
    await f.hold.closed(at(staffText({ error_code: null })));
    expect(f.repo.fail).toHaveBeenCalledWith(
      [staffText().id],
      expect.objectContaining({ from: 'sending' }),
    );
  });

  it('a refused text that cannot be held now (line not ready): null, so it fails as planned', async () => {
    f.dispatch.ready.mockReturnValue(false);
    await expect(f.hold.closed(at(staffText({ error_code: null })))).resolves.toBeNull();
  });

  it('expiry expects the marker: a row released and sending meanwhile is never failed', async () => {
    const held = staffText({ expires_at: until.toISOString() });
    await f.hold.due({ ...at(held), now: until });
    expect(f.repo.fail).toHaveBeenCalledWith(
      [held.id],
      expect.objectContaining({ from: 'awaiting_reply' }),
    );
  });
});
