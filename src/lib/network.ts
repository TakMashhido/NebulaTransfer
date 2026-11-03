// Peer-to-peer session, connection management and the file transfer protocol.
//
// Protocol (every message is an object with a `t` field):
//   hello      both ways, after a connection opens      { device }
//   offer      sender -> receiver                       { id, name, size, mime, chunks, chunkSize, pin }
//   answer     receiver -> sender                       { id, accept, pin? }
//   pin-wrong  sender -> receiver, wrong PIN typed       { id, attemptsLeft }
//   start      sender -> receiver, offer accepted       { id }
//   chunk      sender -> receiver                       { id, i, data }
//   ack        receiver -> sender, chunk i is stored    { id, i }
//   done       sender -> receiver, all chunks acked     { id }
//   done-ack   receiver -> sender                       { id }
//   cancel     either way                               { id, reason }
//
// The PIN never travels from sender to receiver: the receiver types what the sender reads out,
// and only the sender checks it.

import Peer, { type DataConnection, type PeerError } from 'peerjs';
import {
  CHUNK_SIZE, CONNECT_TIMEOUT_MS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_GB, MAX_PIN_ATTEMPTS, SEND_WINDOW,
  peerServerOptions,
} from './config';
import { formatBytes } from './format';
import { describeDevice, friendlyName, generatePeerId, loadPeerId, parsePeerInput, savePeerId, shortId } from './identity';
import { assembleFile, clearAllChunks, deleteFile, freeSpace, saveChunk } from './storage';
import { notify, store } from '../store/useStore';
import type { Transfer } from '../store/types';

type Msg =
  | { t: 'hello'; device?: string }
  | { t: 'offer'; id: string; name: string; size: number; mime: string; chunks: number; chunkSize: number; pin: boolean }
  | { t: 'answer'; id: string; accept: boolean; pin?: string }
  | { t: 'pin-wrong'; id: string; attemptsLeft: number }
  | { t: 'start'; id: string }
  | { t: 'chunk'; id: string; i: number; data: ArrayBuffer | Uint8Array }
  | { t: 'ack'; id: string; i: number }
  | { t: 'done'; id: string }
  | { t: 'done-ack'; id: string }
  | { t: 'cancel'; id: string; reason?: string };

// ---------------------------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------------------------

let peer: Peer | null = null;
let stopping = false;
let reconnectTimer: number | undefined;
let reconnectAttempts = 0;
let pendingAutoConnect: string | null = null;

const conns = new Map<string, DataConnection>();
const pendingConnects = new Map<string, (reason: string) => void>();

interface Outgoing {
  file: File;
  peerId: string;
  pin?: string;
  pinAttempts: number;
  acked: number;
  cancelled: boolean;
  failure?: string;
  /** The other side (or our user) cancelled - not an error. */
  cancelledByUser?: boolean;
  answer?: (msg: Extract<Msg, { t: 'answer' }>) => void;
  wake?: () => void;
}
const outgoing = new Map<string, Outgoing>();
const sendQueues = new Map<string, Promise<void>>();

interface Incoming {
  peerId: string;
  chunks: number;
  chunkSize: number;
  size: number;
  stored: number;
  started: boolean;
  cancelled: boolean;
}
const incoming = new Map<string, Incoming>();

const progressClock = new Map<string, { time: number; bytes: number }>();

class TransferAbort extends Error {}

// ---------------------------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------------------------

export function startSession(retry = 0): void {
  if (peer) return;
  stopping = false;
  const id = retry === 0 ? loadPeerId() : savePeerId(generatePeerId());
  store().setSession({ status: 'connecting', sessionError: null, myId: id });

  const p = new Peer(id, peerServerOptions());
  peer = p;
  let opened = false;

  p.on('open', (openId) => {
    opened = true;
    reconnectAttempts = 0;
    store().setSession({ status: 'online', myId: openId, sessionError: null });
    store().addLog(`You are online as ${shortId(openId)}`, 'success');
    if (pendingAutoConnect) {
      const target = pendingAutoConnect;
      pendingAutoConnect = null;
      void connectTo(target);
    }
  });

  p.on('connection', (conn) => setupConnection(conn, false));

  p.on('disconnected', () => {
    if (stopping || peer !== p || p.destroyed) return;
    store().setSession({ status: 'reconnecting' });
    scheduleReconnect(p);
  });

  p.on('error', (err: PeerError<string>) => {
    if (peer !== p) return;
    switch (err.type) {
      case 'peer-unavailable': {
        const target = extractPeerId(err.message);
        if (target && pendingConnects.has(target)) pendingConnects.get(target)!(`${shortId(target)} is offline or the ID is wrong.`);
        else notify('That device is not reachable.', 'warning');
        return;
      }
      case 'unavailable-id':
        // Someone else holds our stored ID (or a stale tab does) - pick a fresh one.
        destroyPeer();
        if (retry < 3) startSession(retry + 1);
        else failSession('Could not reserve an ID on the server. Please try again.');
        return;
      case 'browser-incompatible':
        failSession('This browser does not support WebRTC data channels.');
        return;
      case 'network':
      case 'server-error':
      case 'socket-error':
      case 'socket-closed':
        if (!opened) {
          destroyPeer();
          failSession('Could not reach the signalling server. Check your connection and retry.');
        } else if (!stopping) {
          store().setSession({ status: 'reconnecting' });
          scheduleReconnect(p);
        }
        return;
      default:
        notify(err.message || 'Unexpected connection error', 'error');
    }
  });
}

function extractPeerId(text: string): string | null {
  const match = /peer\s+(\S+)$/i.exec(text.trim());
  return match ? match[1] : null;
}

function scheduleReconnect(p: Peer) {
  window.clearTimeout(reconnectTimer);
  const delay = Math.min(15_000, 1000 * 2 ** reconnectAttempts++);
  reconnectTimer = window.setTimeout(() => {
    if (peer === p && !p.destroyed && p.disconnected) {
      try {
        p.reconnect();
      } catch {
        scheduleReconnect(p);
      }
    }
  }, delay);
}

function failSession(message: string) {
  store().setSession({ status: 'error', sessionError: message });
  store().addLog(message, 'error');
}

function destroyPeer() {
  window.clearTimeout(reconnectTimer);
  const p = peer;
  peer = null;
  try {
    p?.destroy();
  } catch {
    /* already gone */
  }
}

export function stopSession(): void {
  stopping = true;
  for (const id of [...outgoing.keys(), ...incoming.keys()]) cancelTransfer(id, 'Session ended');
  for (const conn of conns.values()) conn.close();
  conns.clear();
  for (const fail of pendingConnects.values()) fail('Session ended');
  destroyPeer();
  store().resetPeers();
  store().setSession({ status: 'idle', sessionError: null });
  store().addLog('You went offline', 'info');
}

export function restartWithNewId(): void {
  stopSession();
  savePeerId(generatePeerId());
  startSession();
}

/** Connect automatically once online (used for ?connect=<id> share links). */
export function queueAutoConnect(raw: string) {
  const id = parsePeerInput(raw);
  if (!id) return;
  if (store().status === 'online') void connectTo(id);
  else pendingAutoConnect = id;
}

export function hasActiveTransfers(): boolean {
  return store().transfers.some((t) => t.status === 'transferring' || t.status === 'offered');
}

// ---------------------------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------------------------

export async function connectTo(raw: string): Promise<boolean> {
  const id = parsePeerInput(raw);
  const s = store();
  if (!id) {
    notify('That does not look like a NebulaTransfer ID.', 'warning');
    return false;
  }
  if (!peer || s.status === 'idle' || s.status === 'error') {
    notify('Go online first, then connect.', 'warning');
    return false;
  }
  if (id === s.myId) {
    notify('That is your own ID - open it on another device.', 'warning');
    return false;
  }
  if (conns.has(id)) {
    s.selectPeer(id);
    notify(`Already connected to ${friendlyName(id)}.`, 'info');
    return true;
  }
  if (pendingConnects.has(id)) return false;

  s.setConnecting(id, true);
  const conn = peer.connect(id, { reliable: true, metadata: { device: describeDevice() } });

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      pendingConnects.delete(id);
      store().setConnecting(id, false);
      if (!ok) {
        conn.close();
        notify(`Could not connect: ${reason}`, 'error');
      }
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false, `${shortId(id)} did not answer in time.`), CONNECT_TIMEOUT_MS);
    pendingConnects.set(id, (reason) => finish(false, reason));
    conn.on('open', () => finish(true));
    conn.on('error', (err) => finish(false, err.message));
    setupConnection(conn, true);
  });
}

function setupConnection(conn: DataConnection, initiatedByMe: boolean) {
  const id = conn.peer;
  let iceTimer: number | undefined;

  const onOpen = () => {
    const existing = conns.get(id);
    if (existing && existing !== conn && existing.open) {
      // Both sides connected at the same moment. Keep the connection started by the smaller ID
      // so both ends make the same choice.
      const me = store().myId ?? '';
      const keepNew = initiatedByMe ? me < id : id < me;
      if (!keepNew) {
        conn.close();
        return;
      }
      conns.set(id, conn);
      existing.close();
    } else {
      conns.set(id, conn);
    }
    store().addPeer({
      id,
      name: friendlyName(id),
      device: conn.metadata?.device,
      connectedAt: Date.now(),
    });
    safeSend(conn, { t: 'hello', device: describeDevice() });
    notify(
      initiatedByMe ? `Connected to ${friendlyName(id)}` : `${friendlyName(id)} connected to you`,
      'success',
    );
  };

  if (conn.open) onOpen();
  else conn.on('open', onOpen);

  conn.on('data', (raw) => {
    if (conns.get(id) !== conn) return;
    void handleMessage(id, conn, raw);
  });
  conn.on('close', () => {
    window.clearTimeout(iceTimer);
    handleClosed(id, conn);
  });
  conn.on('error', (err) => console.warn('Connection error', id, err));
  conn.on('iceStateChanged', (state) => {
    window.clearTimeout(iceTimer);
    if (state === 'failed' || state === 'closed') conn.close();
    // "disconnected" can recover on its own; give it a moment before giving up.
    if (state === 'disconnected') iceTimer = window.setTimeout(() => conn.close(), 8000);
  });
}

function handleClosed(id: string, conn: DataConnection) {
  if (conns.get(id) !== conn) return;
  conns.delete(id);
  store().removePeer(id);

  for (const [tid, ctx] of outgoing) {
    if (ctx.peerId === id) abortOutgoing(tid, 'Connection lost');
  }
  for (const [tid, ctx] of incoming) {
    if (ctx.peerId === id) {
      incoming.delete(tid);
      store().updateTransfer(tid, { status: 'failed', error: 'Connection lost', finishedAt: Date.now() });
      void deleteFile(tid, ctx.chunks);
    }
  }
  if (!stopping) notify(`${friendlyName(id)} disconnected`, 'warning');
}

export function disconnectPeer(id: string) {
  const conn = conns.get(id);
  if (conn) {
    conn.close();
    handleClosed(id, conn);
  }
}

function safeSend(conn: DataConnection | undefined, msg: Msg): boolean {
  if (!conn || !conn.open) return false;
  try {
    void conn.send(msg);
    return true;
  } catch (err) {
    console.warn('send failed', err);
    return false;
  }
}

function sendTo(peerId: string, msg: Msg): boolean {
  return safeSend(conns.get(peerId), msg);
}

// ---------------------------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------------------------

function newTransferId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newPin() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

export function sendFiles(peerId: string, files: File[], usePin: boolean): void {
  if (!conns.has(peerId)) {
    notify('Pick a connected device first.', 'warning');
    return;
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      notify(`${file.name} is larger than ${MAX_FILE_SIZE_GB} GB and was skipped.`, 'warning');
      continue;
    }
    const id = newTransferId();
    const transfer: Transfer = {
      id,
      direction: 'out',
      peerId,
      name: file.name,
      size: file.size,
      mime: file.type,
      chunks: Math.max(1, Math.ceil(file.size / CHUNK_SIZE)),
      status: 'queued',
      bytes: 0,
      speed: 0,
      createdAt: Date.now(),
      pin: usePin ? newPin() : undefined,
    };
    store().addTransfer(transfer);
    outgoing.set(id, { file, peerId, pin: transfer.pin, pinAttempts: 0, acked: 0, cancelled: false });

    // One transfer at a time per device keeps the PIN prompts and bandwidth sane.
    const previous = sendQueues.get(peerId) ?? Promise.resolve();
    const next = previous.then(() => runOutgoing(id, transfer));
    sendQueues.set(peerId, next);
    void next.finally(() => {
      if (sendQueues.get(peerId) === next) sendQueues.delete(peerId);
    });
  }
}

function abortOutgoing(id: string, reason: string, byUser = false) {
  const ctx = outgoing.get(id);
  if (!ctx) return;
  ctx.cancelled = true;
  ctx.failure = reason;
  ctx.cancelledByUser = byUser;
  ctx.wake?.();
  ctx.answer?.({ t: 'answer', id, accept: false });
}

async function runOutgoing(id: string, t: Transfer): Promise<void> {
  const ctx = outgoing.get(id);
  if (!ctx) return;
  const update = (patch: Partial<Transfer>) => store().updateTransfer(id, patch);
  const check = () => {
    if (ctx.cancelled) throw new TransferAbort(ctx.failure ?? 'Cancelled');
  };

  try {
    check();
    update({ status: 'offered' });
    const offered = sendTo(ctx.peerId, {
      t: 'offer', id, name: t.name, size: t.size, mime: t.mime, chunks: t.chunks, chunkSize: CHUNK_SIZE, pin: !!ctx.pin,
    });
    if (!offered) throw new TransferAbort('Device is not connected');

    // Wait for the receiver to accept and, if needed, type the right PIN.
    for (;;) {
      const answer = await new Promise<Extract<Msg, { t: 'answer' }>>((resolve) => (ctx.answer = resolve));
      ctx.answer = undefined;
      check();
      if (!answer.accept) {
        outgoing.delete(id);
        update({ status: 'declined', finishedAt: Date.now() });
        notify(`${friendlyName(ctx.peerId)} declined ${t.name}`, 'warning');
        return;
      }
      if (!ctx.pin || answer.pin === ctx.pin) break;
      ctx.pinAttempts++;
      if (ctx.pinAttempts >= MAX_PIN_ATTEMPTS) {
        sendTo(ctx.peerId, { t: 'cancel', id, reason: 'Too many wrong PIN attempts' });
        throw new TransferAbort('Too many wrong PIN attempts');
      }
      sendTo(ctx.peerId, { t: 'pin-wrong', id, attemptsLeft: MAX_PIN_ATTEMPTS - ctx.pinAttempts });
    }

    sendTo(ctx.peerId, { t: 'start', id });
    const startedAt = Date.now();
    update({ status: 'transferring', startedAt });
    progressClock.set(id, { time: startedAt, bytes: 0 });

    let next = 0;
    while (ctx.acked < t.chunks) {
      check();
      if (next < t.chunks && next - ctx.acked < SEND_WINDOW) {
        const data = await ctx.file.slice(next * CHUNK_SIZE, (next + 1) * CHUNK_SIZE).arrayBuffer();
        check();
        if (!sendTo(ctx.peerId, { t: 'chunk', id, i: next, data })) throw new TransferAbort('Connection lost');
        next++;
        continue;
      }
      await new Promise<void>((resolve) => (ctx.wake = resolve));
      ctx.wake = undefined;
    }

    // Everything is acknowledged; wait for the receiver to confirm it has the whole file.
    sendTo(ctx.peerId, { t: 'done', id });
    await new Promise<void>((resolve) => (ctx.wake = resolve));
    check();

    const finishedAt = Date.now();
    outgoing.delete(id);
    progressClock.delete(id);
    update({
      status: 'done', bytes: t.size, finishedAt, pin: undefined,
      speed: t.size / Math.max(0.001, (finishedAt - startedAt) / 1000),
    });
    notify(`Sent ${t.name} to ${friendlyName(ctx.peerId)}`, 'success');
  } catch (err) {
    outgoing.delete(id);
    progressClock.delete(id);
    const reason = err instanceof Error ? err.message : String(err);
    const cancelled = !!ctx.cancelledByUser;
    const ownCancel = reason === 'Cancelled' || reason === 'Session ended';
    update({
      status: cancelled ? 'cancelled' : 'failed',
      error: ownCancel ? undefined : reason,
      finishedAt: Date.now(),
      pin: undefined,
    });
    if (!cancelled) notify(`${t.name}: ${reason}`, 'error');
    else if (!ownCancel) notify(`${t.name}: ${reason}`, 'warning');
  }
}

function reportProgress(id: string, bytes: number, force = false) {
  const now = Date.now();
  const clock = progressClock.get(id);
  if (!clock) {
    progressClock.set(id, { time: now, bytes });
    store().updateTransfer(id, { bytes });
    return;
  }
  const dt = now - clock.time;
  if (!force && dt < 200) return;
  const current = store().transfers.find((t) => t.id === id);
  const instant = dt > 0 ? ((bytes - clock.bytes) * 1000) / dt : 0;
  const speed = current && current.speed > 0 ? current.speed * 0.7 + instant * 0.3 : instant;
  progressClock.set(id, { time: now, bytes });
  store().updateTransfer(id, { bytes, speed });
}

// ---------------------------------------------------------------------------------------------
// Receiving
// ---------------------------------------------------------------------------------------------

export async function acceptOffer(transferId: string, pin?: string): Promise<void> {
  const offer = store().offers.find((o) => o.transferId === transferId);
  if (!offer) return;
  if (!incoming.has(transferId)) {
    const space = await freeSpace();
    if (space !== null && space < offer.size) {
      notify(`Not enough browser storage for ${offer.name} (${formatBytes(space)} free).`, 'error');
      declineOffer(transferId);
      return;
    }
    incoming.set(transferId, {
      peerId: offer.peerId, chunks: offer.chunks, chunkSize: CHUNK_SIZE, size: offer.size,
      stored: 0, started: false, cancelled: false,
    });
  }
  store().upsertOffer({ ...offer, wrongPin: false, verifying: true });
  if (!sendTo(offer.peerId, { t: 'answer', id: transferId, accept: true, pin: pin?.replace(/\D/g, '') })) {
    incoming.delete(transferId);
    store().removeOffer(transferId);
    notify('The sender is no longer connected.', 'warning');
  }
}

export function declineOffer(transferId: string): void {
  const offer = store().offers.find((o) => o.transferId === transferId);
  if (!offer) return;
  incoming.delete(transferId);
  store().removeOffer(transferId);
  sendTo(offer.peerId, { t: 'answer', id: transferId, accept: false });
  store().addLog(`Declined ${offer.name} from ${friendlyName(offer.peerId)}`);
}

async function handleMessage(peerId: string, conn: DataConnection, raw: unknown) {
  if (!raw || typeof raw !== 'object' || typeof (raw as { t?: unknown }).t !== 'string') return;
  const msg = raw as Msg;

  switch (msg.t) {
    case 'hello':
      if (typeof msg.device === 'string') store().updatePeer(peerId, { device: msg.device.slice(0, 60) });
      return;

    case 'offer': {
      if (
        typeof msg.id !== 'string' || typeof msg.name !== 'string' || !Number.isFinite(msg.size) ||
        !Number.isInteger(msg.chunks) || msg.chunks < 1 || msg.chunkSize !== CHUNK_SIZE
      ) {
        safeSend(conn, { t: 'cancel', id: String(msg.id), reason: 'Incompatible app version' });
        return;
      }
      store().upsertOffer({
        transferId: msg.id, peerId, name: msg.name.slice(0, 255), size: msg.size, mime: String(msg.mime || ''),
        chunks: msg.chunks, pinRequired: !!msg.pin, attemptsLeft: MAX_PIN_ATTEMPTS, receivedAt: Date.now(),
      });
      store().addLog(`${friendlyName(peerId)} wants to send ${msg.name} (${formatBytes(msg.size)})`);
      return;
    }

    case 'answer': {
      const ctx = outgoing.get(msg.id);
      if (ctx && ctx.peerId === peerId) ctx.answer?.(msg);
      return;
    }

    case 'pin-wrong': {
      const offer = store().offers.find((o) => o.transferId === msg.id);
      if (offer) store().upsertOffer({ ...offer, wrongPin: true, verifying: false, attemptsLeft: msg.attemptsLeft });
      return;
    }

    case 'start': {
      const ctx = incoming.get(msg.id);
      const offer = store().offers.find((o) => o.transferId === msg.id);
      if (!ctx || ctx.peerId !== peerId || !offer) return;
      ctx.started = true;
      store().removeOffer(msg.id);
      const now = Date.now();
      store().addTransfer({
        id: msg.id, direction: 'in', peerId, name: offer.name, size: offer.size, mime: offer.mime,
        chunks: offer.chunks, status: 'transferring', bytes: 0, speed: 0, createdAt: now, startedAt: now,
      });
      progressClock.set(msg.id, { time: now, bytes: 0 });
      notify(`Receiving ${offer.name}`, 'info', false);
      return;
    }

    case 'chunk': {
      const ctx = incoming.get(msg.id);
      if (!ctx || !ctx.started || ctx.cancelled || ctx.peerId !== peerId) return;
      if (!Number.isInteger(msg.i) || msg.i < 0 || msg.i >= ctx.chunks) return;
      try {
        await saveChunk(msg.id, msg.i, msg.data);
      } catch (err) {
        console.error(err);
        ctx.cancelled = true;
        incoming.delete(msg.id);
        safeSend(conn, { t: 'cancel', id: msg.id, reason: 'Receiver ran out of storage' });
        store().updateTransfer(msg.id, { status: 'failed', error: 'Could not save to browser storage', finishedAt: Date.now() });
        void deleteFile(msg.id, ctx.chunks);
        notify('Could not save the incoming file - browser storage is full.', 'error');
        return;
      }
      if (ctx.cancelled) return;
      ctx.stored++;
      safeSend(conn, { t: 'ack', id: msg.id, i: msg.i });
      reportProgress(msg.id, Math.min(ctx.size, ctx.stored * ctx.chunkSize));
      return;
    }

    case 'ack': {
      const ctx = outgoing.get(msg.id);
      if (!ctx || ctx.peerId !== peerId) return;
      ctx.acked++;
      reportProgress(msg.id, Math.min(ctx.file.size, ctx.acked * CHUNK_SIZE));
      ctx.wake?.();
      return;
    }

    case 'done': {
      const ctx = incoming.get(msg.id);
      if (!ctx || ctx.peerId !== peerId) return;
      incoming.delete(msg.id);
      progressClock.delete(msg.id);
      const t = store().transfers.find((x) => x.id === msg.id);
      const finishedAt = Date.now();
      if (ctx.stored !== ctx.chunks) {
        store().updateTransfer(msg.id, { status: 'failed', error: 'Some parts went missing', finishedAt });
        safeSend(conn, { t: 'cancel', id: msg.id, reason: 'Receiver is missing parts of the file' });
        return;
      }
      safeSend(conn, { t: 'done-ack', id: msg.id });
      const elapsed = Math.max(0.001, (finishedAt - (t?.startedAt ?? finishedAt)) / 1000);
      store().updateTransfer(msg.id, { status: 'done', bytes: ctx.size, finishedAt, speed: ctx.size / elapsed });
      notify(`Received ${t?.name ?? 'a file'} from ${friendlyName(peerId)}`, 'success');
      return;
    }

    case 'done-ack': {
      const ctx = outgoing.get(msg.id);
      if (ctx && ctx.peerId === peerId) ctx.wake?.();
      return;
    }

    case 'cancel': {
      const reason = typeof msg.reason === 'string' ? msg.reason.slice(0, 120) : 'Cancelled by the other device';
      const out = outgoing.get(msg.id);
      if (out && out.peerId === peerId) {
        abortOutgoing(msg.id, reason, reason !== 'Too many wrong PIN attempts' && !/storage|missing|version/i.test(reason));
        return;
      }
      const offer = store().offers.find((o) => o.transferId === msg.id && o.peerId === peerId);
      if (offer) {
        store().removeOffer(msg.id);
        notify(`${offer.name}: ${reason}`, 'warning');
      }
      const inc = incoming.get(msg.id);
      if (inc && inc.peerId === peerId) {
        inc.cancelled = true;
        incoming.delete(msg.id);
        progressClock.delete(msg.id);
        store().updateTransfer(msg.id, { status: 'cancelled', error: reason, finishedAt: Date.now() });
        void deleteFile(msg.id, inc.chunks);
        if (inc.started) notify(`Transfer cancelled: ${reason}`, 'warning');
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// User actions on transfers
// ---------------------------------------------------------------------------------------------

export function cancelTransfer(id: string, reason = 'Cancelled'): void {
  const out = outgoing.get(id);
  if (out) {
    sendTo(out.peerId, { t: 'cancel', id, reason: reason === 'Cancelled' ? 'The sender cancelled' : reason });
    abortOutgoing(id, reason, true);
    return;
  }
  const inc = incoming.get(id);
  if (inc) {
    inc.cancelled = true;
    incoming.delete(id);
    progressClock.delete(id);
    sendTo(inc.peerId, { t: 'cancel', id, reason: 'The receiver cancelled' });
    store().updateTransfer(id, { status: 'cancelled', finishedAt: Date.now() });
    store().removeOffer(id);
    void deleteFile(id, inc.chunks);
  }
}

export async function getFileBlob(t: Transfer): Promise<Blob> {
  return assembleFile(t.id, t.chunks, t.mime);
}

export async function saveReceived(t: Transfer): Promise<void> {
  try {
    const blob = await getFileBlob(t);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t.name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    store().updateTransfer(t.id, { saved: true });
  } catch (err) {
    notify(err instanceof Error ? err.message : 'Could not save the file', 'error');
  }
}

export async function removeTransfers(ids: string[]): Promise<void> {
  const list = store().transfers.filter((t) => ids.includes(t.id));
  for (const t of list) {
    if (t.status === 'transferring' || t.status === 'offered' || t.status === 'queued') cancelTransfer(t.id);
    if (t.direction === 'in') await deleteFile(t.id, t.chunks);
  }
  store().removeTransfers(ids);
}

export function initStorage() {
  return clearAllChunks();
}
