import { describe, expect, it } from 'vitest';
import * as inbox from './index';
import { clearAllDrafts, getDraft, setDraft } from './composer/lib/draft-store';
import { LinkFamilyDialog } from './lead/LinkFamilyDialog';
import { useThreadListsAction } from './lists/lib/use-thread-lists-action';
import { BUBBLE_ROW } from './messages/lib/bubble-side';
import { SalesRegisterButton, SalesRegisterDialog } from './sales/SalesRegisterAction';
import { canRegisterFrom } from './sales/sales-register';
import { fillComposer } from './saved-replies/lib/filter';
import { inboxBase, InboxModeContext, showsPhone, useInboxMode } from './shared/mode';

// The public API that calls and sales-money import once they leave the inbox (docs/32 b22).
describe('inbox barrel', () => {
  it('re-exports the helpers the calls and sales-money modules use', () => {
    expect(inbox.BUBBLE_ROW).toBe(BUBBLE_ROW);
    expect(inbox.clearAllDrafts).toBe(clearAllDrafts);
    expect(inbox.getDraft).toBe(getDraft);
    expect(inbox.setDraft).toBe(setDraft);
    expect(inbox.fillComposer).toBe(fillComposer);
    expect(inbox.LinkFamilyDialog).toBe(LinkFamilyDialog);
    expect(inbox.useThreadListsAction).toBe(useThreadListsAction);
    expect(inbox.SalesRegisterButton).toBe(SalesRegisterButton);
    expect(inbox.SalesRegisterDialog).toBe(SalesRegisterDialog);
    expect(inbox.canRegisterFrom).toBe(canRegisterFrom);
  });

  it('re-exports the inbox mode helpers', () => {
    expect(inbox.InboxModeContext).toBe(InboxModeContext);
    expect(inbox.useInboxMode).toBe(useInboxMode);
    expect(inbox.inboxBase).toBe(inboxBase);
    expect(inbox.showsPhone('teacher')).toBe(false);
    expect(inbox.showsPhone('sales')).toBe(true);
  });
});
