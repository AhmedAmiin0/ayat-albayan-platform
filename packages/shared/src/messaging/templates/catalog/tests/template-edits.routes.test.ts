import { describe, expect, it } from 'vitest';
import { templateEditRoutes as edits } from '..';
import { aLineSync } from './template-sync.builder';
import { aTemplateView } from '../../../../testing/messaging/templates';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const ALL = [
  edits.content, edits.submit, edits.line, edits.number, edits.crmStatus, edits.crmName,
  edits.starter,
];
const NUMBER = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('templateEditRoutes', () => {
  it('keeps the paths of today', () => {
    expect(ALL.map(line)).toEqual([
      'PATCH /messaging/templates/:key/content',
      'POST /messaging/templates/:key/submit',
      'PATCH /messaging/templates/:key/line',
      'PUT /messaging/templates/:key/number',
      'PUT /messaging/templates/:key/crm-status',
      'PUT /messaging/templates/:key/crm-name',
      'PATCH /messaging/templates/:key/starter',
    ]);
  });

  it('lets only template managers in, tagged messaging', () => {
    expect(ALL.map((r) => r.permissions)).toEqual(ALL.map(() => ['templates.manage']));
    expect(ALL.map((r) => r.tags)).toEqual(ALL.map(() => ['messaging']));
  });

  it('checks the edited key and takes any other key as it is', () => {
    expect(edits.content.params.safeParse({ key: 'Bad Key' }).success).toBe(false);
    expect(edits.submit.params.parse({ key: 'Bad Key' })).toEqual({ key: 'Bad Key' });
  });

  it('refuses a body outside each edit', () => {
    expect(edits.line.body.safeParse({ line: 'sms' }).success).toBe(false);
    expect(edits.number.body.safeParse({ number_id: 'x' }).success).toBe(false);
    expect(edits.number.body.parse({ number_id: null })).toEqual({ number_id: null });
    expect(edits.crmStatus.body.safeParse({ status: 'live' }).success).toBe(false);
    expect(edits.starter.body.safeParse({ sales_starter: 'yes' }).success).toBe(false);
  });

  it('answers the template, its move or its number', () => {
    const view = aTemplateView();
    expect(edits.submit.response.parse(view)).toEqual(view);
    const move = { template: view, sync: aLineSync() };
    expect(edits.line.response.parse(move)).toEqual(move);
    const set = { template: view, not_approved_on_number: true };
    expect(edits.number.response.parse(set)).toEqual(set);
    expect(edits.number.response.safeParse({ template: view }).success).toBe(false);
    expect(edits.number.body.parse({ number_id: NUMBER })).toEqual({ number_id: NUMBER });
  });
});
