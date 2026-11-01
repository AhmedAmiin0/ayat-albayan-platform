import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { Giphy, mp4Of } from './giphy';

// GIPHY for the chat's GIF tab (owner 2026-11-01): never called for real in tests.
const MP4 = 'https://media2.giphy.com/media/abc/giphy.mp4';
const gif = (id: string, over: object = {}) => ({
  id,
  title: `t-${id}`,
  images: {
    fixed_width: { url: `https://media.giphy.com/${id}/200w.gif`, width: '200', height: '150', mp4: MP4 },
    original: { mp4: MP4 },
    ...over,
  },
});
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const video = () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'video/mp4' } });

describe('Giphy.list', () => {
  it('trending without words, G-rated, the key in the query; an unreadable GIF is left out', async () => {
    const transport = vi.fn().mockResolvedValue(json({ data: [gif('a1'), { id: 'bad' }] }));
    const items = await new Giphy('k1', transport).list(undefined);
    const url = new URL(String(transport.mock.calls[0]?.[0]));
    expect(url.pathname).toBe('/v1/gifs/trending');
    expect(Object.fromEntries(url.searchParams)).toEqual({ api_key: 'k1', limit: '24', rating: 'g' });
    expect(items).toEqual([
      { id: 'a1', title: 't-a1', preview: 'https://media.giphy.com/a1/200w.gif', width: 200, height: 150 },
    ]);
  });

  it('a search sends its words', async () => {
    const transport = vi.fn().mockResolvedValue(json({ data: [] }));
    await new Giphy('k1', transport).list('شكرا');
    const url = new URL(String(transport.mock.calls[0]?.[0]));
    expect(url.pathname).toBe('/v1/gifs/search');
    expect(url.searchParams.get('q')).toBe('شكرا');
  });

  it('a GIPHY failure is 502 giphy_failed', async () => {
    const transport = vi.fn().mockResolvedValue(new Response('no', { status: 403 }));
    const err = await new Giphy('k1', transport).list(undefined).catch((e: unknown) => e);
    if (!(err instanceof HttpException)) throw new Error('expected an HttpException');
    expect(err.getStatus()).toBe(502);
  });
});

describe('Giphy.mp4', () => {
  it('looks the id up, then reads the mp4 from GIPHY’s media host', async () => {
    const transport = vi.fn().mockResolvedValueOnce(json({ data: gif('x9') })).mockResolvedValueOnce(video());
    const bytes = await new Giphy('k1', transport).mp4('x9');
    expect(new URL(String(transport.mock.calls[0]?.[0])).pathname).toBe('/v1/gifs/x9');
    expect(transport.mock.calls[1]?.[0]).toBe(MP4);
    expect([...bytes]).toEqual([1, 2, 3]);
  });

  it('refuses a body that is not an mp4', async () => {
    const page = new Response('<html>', { headers: { 'content-type': 'text/html' } });
    const transport = vi.fn().mockResolvedValueOnce(json({ data: gif('x9') })).mockResolvedValueOnce(page);
    await expect(new Giphy('k1', transport).mp4('x9')).rejects.toBeInstanceOf(HttpException);
  });

  it('reads an mp4 only from GIPHY’s media hosts', () => {
    const still = { url: 'https://media.giphy.com/x9/200w.gif', width: 200, height: 150 };
    const evil = { id: 'x9', title: '', images: { fixed_width: still, original: { mp4: 'https://evil.example/x.mp4' } } };
    expect(() => mp4Of(evil)).toThrow(HttpException);
    expect(mp4Of({ ...evil, images: { fixed_width: { ...still, mp4: MP4 } } })).toBe(MP4);
  });
});
