import { describe, expect, it, vi } from 'vitest';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { TemplateNames } from './template-names';

// One catalog read a minute, shared; a failed read is not kept.

const ROW = templateRow({ key: 'teacher_lesson_v2', meta_name: 'teacher_lesson_v2' });

describe('TemplateNames', () => {
  it('reads the catalog once a minute for every name', async () => {
    const all = vi.fn(async () => [ROW]);
    const names = new TemplateNames({ all } as unknown as TemplatesRepo);
    expect((await names.find('teacher_lesson_v2', 0))?.key).toBe('teacher_lesson_v2');
    expect(await names.find('other', 59_000)).toBeNull();
    expect(all).toHaveBeenCalledTimes(1);
    await names.find('teacher_lesson_v2', 60_000);
    expect(all).toHaveBeenCalledTimes(2);
  });

  it('a failed read is retried on the next call', async () => {
    const all = vi.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValue([ROW]);
    const names = new TemplateNames({ all } as unknown as TemplatesRepo);
    await expect(names.find('teacher_lesson_v2', 0)).rejects.toThrow('db down');
    expect((await names.find('teacher_lesson_v2', 1))?.key).toBe('teacher_lesson_v2');
  });
});
