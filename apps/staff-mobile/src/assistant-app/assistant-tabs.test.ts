import type { Permission } from '@ab/catalog';
import { t } from '@ab/mobile-kit';
import { assistantTabItems } from './assistant-tabs';

test('the classroom assistant: «حلقاتي» then «المزيد»', () => {
  const tabs = assistantTabItems((p: Permission) => p === 'self.assistant');
  expect(tabs.map((tab) => [tab.name, tab.title, tab.hidden])).toEqual([
    ['lessons', t.mobileRoles.lessonsTab, false],
    ['more', t.mobile.more, undefined],
  ]);
});

test('without self.assistant only «المزيد» stays', () => {
  expect(assistantTabItems(() => false).filter((tab) => !tab.hidden).map((tab) => tab.name)).toEqual(['more']);
});
