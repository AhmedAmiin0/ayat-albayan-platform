import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { toVoiceOgg, voiceArgs, type FfmpegRun } from './voice-ogg';

// A fake ffmpeg: never the real binary in a unit test.
const M4A = Uint8Array.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
const OGG = new TextEncoder().encode('OggS-opus');
const outputOf = (args: readonly string[]) => args[args.length - 1] ?? '';

describe('voiceArgs', () => {
  it('mono 48 kHz opus at 24 kbps, the input and output as given', () => {
    const args = voiceArgs('/t/in.m4a', '/t/out.ogg');
    expect(args.join(' ')).toContain('-i /t/in.m4a');
    expect(args.join(' ')).toContain('-ac 1 -ar 48000 -c:a libopus -b:a 24k -application voip');
    expect(outputOf(args)).toBe('/t/out.ogg');
  });
});

describe('toVoiceOgg (owner 2026-10-27: a real WhatsApp voice note)', () => {
  it('writes the m4a to a temp file, returns what ffmpeg wrote, then removes the folder', async () => {
    let dir = '';
    const run = vi.fn<FfmpegRun>(async (args) => {
      dir = dirname(outputOf(args));
      expect(existsSync(args[args.indexOf('-i') + 1] ?? '')).toBe(true);
      await writeFile(outputOf(args), OGG);
    });
    await expect(toVoiceOgg(M4A, run)).resolves.toEqual(OGG);
    expect(run).toHaveBeenCalledTimes(1);
    expect(existsSync(dir)).toBe(false);
  });

  it('ffmpeg missing or failing (or timing out): null, and the temp files are gone', async () => {
    let dir = '';
    const run: FfmpegRun = async (args) => {
      dir = dirname(outputOf(args));
      throw new Error('spawn ffmpeg ENOENT');
    };
    await expect(toVoiceOgg(M4A, run)).resolves.toBeNull();
    expect(existsSync(dir)).toBe(false);
  });

  it('ffmpeg exits 0 but writes nothing (or an empty file): null', async () => {
    await expect(toVoiceOgg(M4A, async () => undefined)).resolves.toBeNull();
    await expect(toVoiceOgg(M4A, (args) => writeFile(outputOf(args), new Uint8Array()))).resolves.toBeNull();
  });
});
