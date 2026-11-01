import { describe, expect, it, vi } from 'vitest';
import type { ChatListsRepo } from './chat-lists.repo';
import { ChatListsService } from './chat-lists.service';

const ID = '0c000000-0000-4000-8000-000000000001';
const LIST = { id: ID, name: 'بانتظار الدفع', count: 0, auto_rule: null };

function setup() {
  const q = {
    all: vi.fn(async () => [LIST]),
    one: vi.fn(async () => LIST),
    count: vi.fn(async () => 3),
    create: vi.fn(async () => LIST),
    rename: vi.fn(async (): Promise<'renamed' | 'taken' | null> => 'renamed'),
    remove: vi.fn(async () => undefined),
    add: vi.fn(async (): Promise<'added' | 'gone'> => 'added'),
    drop: vi.fn(async () => undefined),
  };
  return { q, service: new ChatListsService(q as unknown as ChatListsRepo) };
}

const code = (p: Promise<unknown>) => p.then(() => 'ok', (e: { response?: { code?: string } }) => e.response?.code);

describe('ChatListsService', () => {
  it('creates a list with its normalised key and its creator', async () => {
    const { q, service } = setup();
    await expect(service.create('بانتظار الدفعة', 'u1')).resolves.toEqual(LIST);
    expect(q.create).toHaveBeenCalledWith({ name: 'بانتظار الدفعة', name_key: 'بانتظار الدفعه', created_by: 'u1' });
  });

  it('refuses the 31st list before writing (409 list_limit), and when the cap trigger fires', async () => {
    const { q, service } = setup();
    q.count.mockResolvedValueOnce(30);
    expect(await code(service.create('جديدة', 'u1'))).toBe('list_limit');
    expect(q.create).not.toHaveBeenCalled();
    q.create.mockResolvedValueOnce('limit' as never);
    expect(await code(service.create('جديدة', 'u1'))).toBe('list_limit');
  });

  it('maps a taken name to 409 list_name_taken on create and rename', async () => {
    const { q, service } = setup();
    q.create.mockResolvedValueOnce('taken' as never);
    expect(await code(service.create('أولياء', 'u1'))).toBe('list_name_taken');
    q.rename.mockResolvedValueOnce('taken');
    expect(await code(service.rename(ID, 'اولياء'))).toBe('list_name_taken');
  });

  it('renames and answers the list with its count; 404 for an unknown list', async () => {
    const { q, service } = setup();
    await expect(service.rename(ID, 'مدفوع')).resolves.toEqual(LIST);
    expect(q.rename).toHaveBeenCalledWith(ID, { name: 'مدفوع', name_key: 'مدفوع' });
    q.rename.mockResolvedValueOnce(null);
    expect(await code(service.rename(ID, 'مدفوع'))).toBe('list_not_found');
  });

  it('adds and removes a chat only on a known list (404 list_not_found otherwise)', async () => {
    const { q, service } = setup();
    await service.add({ listId: ID, phone: '+966501234567', by: 'u1' });
    await service.drop(ID, '+966501234567');
    expect(q.add).toHaveBeenCalledWith({ listId: ID, phone: '+966501234567', by: 'u1' });
    expect(q.drop).toHaveBeenCalledWith(ID, '+966501234567');
    q.one.mockResolvedValue(null as never);
    expect(await code(service.add({ listId: ID, phone: '+966501234567', by: 'u1' }))).toBe('list_not_found');
    expect(await code(service.drop(ID, '+966501234567'))).toBe('list_not_found');
    expect(q.add).toHaveBeenCalledTimes(1);
  });

  it('a list deleted between the check and the insert is 404 list_not_found (never a 500)', async () => {
    const { q, service } = setup();
    q.add.mockResolvedValue('gone');
    expect(await code(service.add({ listId: ID, phone: '+966501234567', by: 'u1' }))).toBe('list_not_found');
  });

  it('deletes through the queries (memberships cascade; nothing else is touched)', async () => {
    const { q, service } = setup();
    await service.remove(ID);
    expect(q.remove).toHaveBeenCalledWith(ID);
  });
});
