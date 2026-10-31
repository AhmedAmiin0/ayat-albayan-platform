import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { CreateTemplateDialog } from './CreateTemplateDialog';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

// «قالب جديد» (owner 2026-10-31): the form, checked with the API's schema before it posts.

const S = t.templates.create;
const nth = (text: string, n: number) => text.replace('{n}', String(n));
const field = (label: string) => screen.getByLabelText<HTMLInputElement>(label);
const type = (label: string, value: string) => {
  fireEvent.change(field(label), { target: { value } });
};
const save = () => fireEvent.click(screen.getByRole('button', { name: S.save }));

function open(onCrm = () => false) {
  const onCreated = vi.fn();
  renderWithClient(<CreateTemplateDialog line="chat" onCrm={onCrm} onCreated={onCreated} onClose={vi.fn()} />);
  return onCreated;
}

afterEach(() => apiSend.mockReset());

describe('CreateTemplateDialog', () => {
  it('a row per {{n}}, a picked name brings its sample; posts the body and hands the row back', async () => {
    const onCreated = open();
    type(S.key, 'welcome_back');
    type(S.body, 'Hello {{1}}, see you on {{2}}.');
    type(nth(S.variableName, 1), 'student_name');
    expect(field(nth(S.sample, 1)).value).toBe(t.templates.reviewSamples.student_name);
    type(nth(S.sample, 2), 'Sunday');
    fireEvent.click(screen.getByRole('button', { name: S.addReply }));
    type(nth(S.buttonText, 1), 'OK');
    const saved = template({ key: 'welcome_back', meta_name: 'welcome_back', line: 'chat', status: 'not_submitted' });
    apiSend.mockResolvedValue(saved);
    save();
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(saved));
    expect(apiSend).toHaveBeenCalledWith('POST', '/messaging/templates', expect.objectContaining({
      key: 'welcome_back',
      line: 'chat',
      header: null,
      params: [{ name: 'student_name', sample: t.templates.reviewSamples.student_name }, { name: 'var_2', sample: 'Sunday' }],
      buttons: [{ type: 'quick_reply', text: 'OK', intent: 'confirm' }],
    }));
  });

  it('a name outside Meta’s rules, or a variable without a sample, is marked and never sent', () => {
    open();
    type(S.key, 'Welcome Back');
    type(S.body, 'Hello {{1}}.');
    save();
    expect(field(S.key).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByText(S.invalidField).length).toBe(2);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('one link button at most: «إضافة زر رابط» waits once there is one', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: S.addUrl }));
    expect(field(nth(S.buttonUrl, 1)).value).toBe('https://');
    expect(screen.getByRole('button', { name: S.addUrl })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: nth(S.removeFor, 1) }));
    expect(screen.getByRole('button', { name: S.addUrl })).toHaveProperty('disabled', false);
  });

  it('a crm number says where the template is really made; the API’s refusal shows in words', async () => {
    open(() => true);
    expect(screen.getByText(S.crmNote)).toBeTruthy();
    type(S.key, 'welcome_back');
    type(S.body, 'Hello there.');
    apiSend.mockRejectedValue(new ApiError(409, { code: 'template_exists' }));
    save();
    expect(await screen.findByText(t.templates.error.template_exists)).toBeTruthy();
  });
});
