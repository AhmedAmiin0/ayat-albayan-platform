import type { RoomJoinResult } from '@ab/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaErrorText } from './errors';
import { EMPTY_SNAPSHOT, type RoomClient, type RoomSnapshot } from './room-types';
import { t } from '@/lib/i18n';

export interface RoomController {
  snap: RoomSnapshot;
  /** Soft problems (mic denied, share failed): the call goes on. */
  notes: string[];
  /** The join itself failed. */
  failure: string | null;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleShare: () => void;
  enableAudio: () => void;
  leave: () => void;
  attach: (tileKey: string, el: HTMLVideoElement) => () => void;
}

/** Owns one client for the life of the component: connects on mount, disconnects on unmount. */
export function useRoom(join: RoomJoinResult, make: () => RoomClient): RoomController {
  const client = useRef<RoomClient | null>(null);
  const [snap, setSnap] = useState<RoomSnapshot>(EMPTY_SNAPSHOT);
  const [notes, setNotes] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const c = make();
    client.current = c;
    const off = c.subscribe(setSnap);
    c.connect(join.url, join.token)
      .then((fails) => live && setNotes(fails.map((f) => mediaErrorText(f.device, f.error))))
      .catch(() => live && setFailure(t.classroom.error.connect_failed));
    return () => {
      live = false;
      off();
      c.disconnect();
      client.current = null;
    };
  }, [join.url, join.token, make]);

  const run = useCallback((job: (c: RoomClient) => Promise<void>, device: 'mic' | 'cam' | 'share') => {
    const c = client.current;
    if (!c) return;
    setNotes([]);
    job(c).catch((error: unknown) => setNotes([mediaErrorText(device, error)]));
  }, []);

  const attach = useCallback((key: string, el: HTMLVideoElement) => client.current?.attachVideo(key, el) ?? (() => undefined), []);

  return {
    snap,
    attach,
    notes,
    failure,
    toggleMic: () => run((c) => c.setMic(!c.snapshot().micOn), 'mic'),
    toggleCamera: () => run((c) => c.setCamera(!c.snapshot().camOn), 'cam'),
    toggleShare: () => run((c) => c.setShare(!c.snapshot().shareOn), 'share'),
    enableAudio: () => run((c) => c.startAudio(), 'share'),
    leave: () => client.current?.disconnect(),
  };
}

