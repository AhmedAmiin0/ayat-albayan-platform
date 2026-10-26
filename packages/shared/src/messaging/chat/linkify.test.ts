import { describe, expect, it } from 'vitest';
import { splitLinks } from './linkify.js';

describe('splitLinks (W11)', () => {
  it('trims the sentence dot after a link', () => {
    expect(splitLinks('رابط https://a.b/c.')).toEqual([{ text: 'رابط ' }, { text: 'https://a.b/c', href: 'https://a.b/c' }, { text: '.' }]);
  });

  it('trims the Arabic comma, semicolon and a closing bracket', () => {
    expect(splitLinks('(https://a.b/x)، تم')).toEqual([
      { text: '(' },
      { text: 'https://a.b/x', href: 'https://a.b/x' },
      { text: ')، تم' },
    ]);
    expect(splitLinks('https://a.b؛').at(0)).toEqual({ text: 'https://a.b', href: 'https://a.b' });
  });

  it('links http as well as https', () => {
    expect(splitLinks('http://x.com/p?q=1')).toEqual([{ text: 'http://x.com/p?q=1', href: 'http://x.com/p?q=1' }]);
  });

  it('javascript:, ftp://, bare domains and a glued or hostless www. stay text', () => {
    for (const text of ['javascript:alert(1)', 'ftp://files.x.com/a', 'زوروا x.com', 'awww.x.com', 'www.', 'www.x']) {
      expect(splitLinks(text)).toEqual([{ text }]);
    }
  });

  it('www. and a host is a link that opens over https, inside Arabic text', () => {
    expect(splitLinks('زوروا www.x.com/a اليوم')).toEqual([
      { text: 'زوروا ' },
      { text: 'www.x.com/a', href: 'https://www.x.com/a' },
      { text: ' اليوم' },
    ]);
  });

  it('trims the sentence dot after a www. link', () => {
    expect(splitLinks('الموقع www.x.com.')).toEqual([{ text: 'الموقع ' }, { text: 'www.x.com', href: 'https://www.x.com' }, { text: '.' }]);
  });

  it('a URL right after Arabic letters is still a link', () => {
    expect(splitLinks('الرابطhttps://a.b/c')).toEqual([{ text: 'الرابط' }, { text: 'https://a.b/c', href: 'https://a.b/c' }]);
    expect(splitLinks('زوروwww.x.com').at(-1)).toEqual({ text: 'www.x.com', href: 'https://www.x.com' });
  });

  it('two links in one message, one of each kind', () => {
    const parts = splitLinks('الحصة https://meet.x/ab والموقع www.x.com');
    expect(parts.filter((p) => p.href).map((p) => p.href)).toEqual(['https://meet.x/ab', 'https://www.x.com']);
    expect(parts.map((p) => p.text).join('')).toBe('الحصة https://meet.x/ab والموقع www.x.com');
  });

  it('https://www. stays one link, opened as written', () => {
    expect(splitLinks('https://www.x.com')).toEqual([{ text: 'https://www.x.com', href: 'https://www.x.com' }]);
  });

  it('keeps the Arabic text around links in order, and joined back it is the message', () => {
    const text = 'السلام عليكم، الرابط https://meet.x/ab ثم https://b.c/d شكرًا';
    const parts = splitLinks(text);
    expect(parts.map((p) => p.text).join('')).toBe(text);
    expect(parts.filter((p) => p.href).map((p) => p.href)).toEqual(['https://meet.x/ab', 'https://b.c/d']);
    expect(parts[0]).toEqual({ text: 'السلام عليكم، الرابط ' });
    expect(parts.at(-1)).toEqual({ text: ' شكرًا' });
  });

  it('a bare scheme is not a link; no URL at all is one text part', () => {
    expect(splitLinks('http://.').every((p) => !p.href)).toBe(true);
    expect(splitLinks('بدون رابط')).toEqual([{ text: 'بدون رابط' }]);
    expect(splitLinks('')).toEqual([]);
  });
});
