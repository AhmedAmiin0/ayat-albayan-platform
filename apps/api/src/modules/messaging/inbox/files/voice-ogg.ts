import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inTempDir } from './temp-dir';

/** Runs ffmpeg with these arguments; rejects on a non-zero exit, a missing binary or the timeout. */
export type FfmpegRun = (args: readonly string[]) => Promise<void>;

/** Long enough for a 10-minute note on a small instance; a stuck ffmpeg never holds a send longer. */
const FFMPEG_TIMEOUT_MS = 30_000;

/**
 * WhatsApp's voice note format (Meta audio-messages doc): ogg/opus, mono only. 24 kbps keeps a
 * note under Meta's 512 KB play-icon threshold for about 170 s.
 */
export const voiceArgs = (input: string, output: string): string[] => [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-i', input,
  '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '24k', '-application', 'voip',
  output,
];

/** The image's ffmpeg (apps/api/Dockerfile), killed after FFMPEG_TIMEOUT_MS. */
const spawnFfmpeg: FfmpegRun = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: 'ignore', timeout: FFMPEG_TIMEOUT_MS, killSignal: 'SIGKILL' });
    child.once('error', reject);
    child.once('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${String(code)}`))));
  });

/**
 * A recorded voice note (AAC in MP4, as Android records it) as ogg/opus mono, or null when ffmpeg is
 * missing or fails: the caller then sends the m4a as plain audio. Through temp files, never stdin:
 * Android's MP4 has its index (moov) at the end, which a pipe cannot seek to. The files are always removed.
 */
export function toVoiceOgg(bytes: Uint8Array, run: FfmpegRun = spawnFfmpeg): Promise<Uint8Array | null> {
  return inTempDir('voice-', async (dir) => {
    const input = join(dir, 'in.m4a');
    const output = join(dir, 'out.ogg');
    await writeFile(input, bytes);
    await run(voiceArgs(input, output));
    const ogg = new Uint8Array(await readFile(output));
    return ogg.byteLength > 0 ? ogg : null;
  }).catch(() => null);
}
