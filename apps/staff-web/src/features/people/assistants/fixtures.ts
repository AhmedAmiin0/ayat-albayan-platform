import { commission, statement } from '@ab/shared/testing';
import type { AssistantCommissionView, AssistantStatementView } from './api';

// Test-only: the rows live in @ab/shared/testing, shared with the mobile tests.
export { ASSISTANT, termsRowOf } from '@ab/shared/testing';

export const COMMISSION: AssistantCommissionView = commission();

export const STATEMENT: AssistantStatementView = statement();
