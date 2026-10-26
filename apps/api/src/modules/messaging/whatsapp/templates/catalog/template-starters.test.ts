import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../../../common/audit/audit.service';
import { TemplateStarters } from './template-starters';
import type { TemplatesQueries } from './templates.queries';
import { templateRow } from '../../whatsapp.fakes';

// «متاح للمعلمين والمبيعات» (the restricted allow-list) (owner 2026-10-12, docs/16): the admin's per-template flag, audited.

const queries = { get: vi.fn(), update: vi.fn() };
const audit = { record: vi.fn() };
const starters = () => new TemplateStarters(queries as unknown as TemplatesQueries, audit as unknown as AuditService);
const welcome = templateRow({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat', sales_starter: true });

describe('TemplateStarters.set', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queries.get.mockResolvedValue(welcome);
    queries.update.mockImplementation(async (_key: string, patch: object) => ({ ...welcome, ...patch }));
  });

  it('turns a starter off and on: the flag only, audited with before and after', async () => {
    await expect(starters().set('academy_welcome', false, 'admin-1')).resolves.toMatchObject({ key: 'academy_welcome', sales_starter: false, line: 'chat' });
    expect(queries.update).toHaveBeenCalledWith('academy_welcome', { sales_starter: false });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'admin-1',
      entity: 'message_templates',
      action: 'template_starter_set',
      before: { key: 'academy_welcome', sales_starter: true },
      after: { key: 'academy_welcome', sales_starter: false },
    }));
    await expect(starters().set('academy_welcome', true, 'admin-1')).resolves.toMatchObject({ sales_starter: true });
  });

  it('404 template_not_found for an unknown key: nothing written, nothing audited', async () => {
    queries.get.mockResolvedValue(null);
    await expect(starters().set('nope', true, 'admin-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(queries.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
