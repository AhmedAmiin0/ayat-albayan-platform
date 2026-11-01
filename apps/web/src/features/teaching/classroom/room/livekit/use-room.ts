import { chatOpen, dropsChat, type RoomJoinResult } from '@ab/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { connectFailureText } from './connect-failure';
import { mediaErrorText } from './errors';
import { EMPTY_SNAPSHOT, type DataPacketIn, type DataSendOptions, type ModeratedEvent, type RoomClient, type RoomSnapshot } from '@/features/teaching/classroom/room/components/room-types';

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
  /** Data channel: survives a client swap because the listeners live in the hook. */
  sendData: (bytes: Uint8Array, opts: DataSendOptions) => void;
  onData: (listener: (packet: DataPacketIn) => void) => () => void;
  /** A staff member muted my microphone or camera. */
  onModerated: (listener: (e: ModeratedEvent) => void) => () => void;
  /** The whiteboard's canvas track as the screen share; null stops it. */
  setBoardTrack: (track: MediaStreamTrack | null) => void;
}

/** Owns one client for the life of the component: connects on mount, disconnects on unmount. */
export function useRoom(join: RoomJoinResult, make: () => RoomClient): RoomController {
  const client = useRef<RoomClient | null>(null);
  const [snap, setSnap] = useState<RoomSnapshot>(EMPTY_SNAPSHOT);
  const [notes, setNotes] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const data = useRef(new Set<(packet: DataPacketIn) => void>());
  const moderated = useRef(new Set<(e: ModeratedEvent) => void>());
  // A trial lesson has no text chat (owner, 2026-10-11): chat-topic data is neither delivered nor sent.
  const chat = chatOpen(join);

  useEffect(() => {
    let live = true;
    const c = make();
    client.current = c;
    const off = c.subscribe(setSnap);
    const offData = c.onData((packet) => {
      if (!dropsChat(chat, packet.topic)) data.current.forEach((l) => l(packet));
    });
    const offModerated = c.onModerated((e) => moderated.current.forEach((l) => l(e)));
    c.connect(join.url, join.token)
      .then((fails) => live && setNotes(fails.map((f) => mediaErrorText(f.device, f.error))))
      .catch((error: unknown) => live && setFailure(connectFailureText({ url: join.url, error, pageProtocol: window.location.protocol })));
    return () => {
      live = false;
      off();
      offData();
      offModerated();
      c.disconnect();
      client.current = null;
    };
  }, [join.url, join.token, chat, make]);

  const run = useCallback((job: (c: RoomClient) => Promise<void>, device: 'mic' | 'cam' | 'share') => {
    const c = client.current;
    if (!c) return;
    setNotes([]);
    job(c).catch((error: unknown) => setNotes([mediaErrorText(device, error)]));
  }, []);

  const attach = useCallback((key: string, el: HTMLVideoElement) => client.current?.attachVideo(key, el) ?? (() => undefined), []);

  const sendData = useCallback(
    (bytes: Uint8Array, opts: DataSendOptions) => {
      if (dropsChat(chat, opts.topic)) return;
      client.current?.sendData(bytes, opts).catch(() => undefined);
    },
    [chat],
  );
  const onData = useCallback((listener: (packet: DataPacketIn) => void) => {
    data.current.add(listener);
    return () => void data.current.delete(listener);
  }, []);

  const onModerated = useCallback((listener: (e: ModeratedEvent) => void) => {
    moderated.current.add(listener);
    return () => void moderated.current.delete(listener);
  }, []);

  return {
    snap,
    sendData,
    onData,
    onModerated,
    setBoardTrack: (track) => run((c) => c.setBoardTrack(track), 'share'),
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

