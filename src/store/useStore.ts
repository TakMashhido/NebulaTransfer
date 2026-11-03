import { create } from 'zustand';
import type {
  IncomingOffer, LogEntry, LogTone, PeerInfo, SessionStatus, ThemeMode, Toast, Transfer,
} from './types';

const MAX_LOG = 150;
let seq = 1;

function initialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem('nebula.theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* storage blocked */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export interface AppState {
  myId: string | null;
  status: SessionStatus;
  sessionError: string | null;

  peers: PeerInfo[];
  connecting: string[];
  selectedPeerId: string | null;

  transfers: Transfer[];
  offers: IncomingOffer[];

  log: LogEntry[];
  toasts: Toast[];
  theme: ThemeMode;

  setSession: (patch: Partial<Pick<AppState, 'myId' | 'status' | 'sessionError'>>) => void;
  addPeer: (peer: PeerInfo) => void;
  updatePeer: (id: string, patch: Partial<PeerInfo>) => void;
  removePeer: (id: string) => void;
  setConnecting: (id: string, on: boolean) => void;
  selectPeer: (id: string | null) => void;
  resetPeers: () => void;

  addTransfer: (t: Transfer) => void;
  updateTransfer: (id: string, patch: Partial<Transfer>) => void;
  removeTransfers: (ids: string[]) => void;

  upsertOffer: (offer: IncomingOffer) => void;
  removeOffer: (transferId: string) => void;

  addLog: (text: string, tone?: LogTone) => void;
  clearLog: () => void;
  toast: (text: string, tone?: LogTone) => void;
  dismissToast: (id: number) => void;
  toggleTheme: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  myId: null,
  status: 'idle',
  sessionError: null,

  peers: [],
  connecting: [],
  selectedPeerId: null,

  transfers: [],
  offers: [],

  log: [],
  toasts: [],
  theme: initialTheme(),

  setSession: (patch) => set(patch),

  addPeer: (peer) =>
    set((s) => {
      const peers = s.peers.some((p) => p.id === peer.id)
        ? s.peers.map((p) => (p.id === peer.id ? { ...p, ...peer } : p))
        : [...s.peers, peer];
      return { peers, selectedPeerId: s.selectedPeerId ?? peer.id };
    }),
  updatePeer: (id, patch) => set((s) => ({ peers: s.peers.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  removePeer: (id) =>
    set((s) => {
      const peers = s.peers.filter((p) => p.id !== id);
      const selectedPeerId = s.selectedPeerId === id ? (peers[0]?.id ?? null) : s.selectedPeerId;
      return { peers, selectedPeerId, offers: s.offers.filter((o) => o.peerId !== id) };
    }),
  setConnecting: (id, on) =>
    set((s) => ({ connecting: on ? [...new Set([...s.connecting, id])] : s.connecting.filter((c) => c !== id) })),
  selectPeer: (id) => set({ selectedPeerId: id }),
  resetPeers: () => set({ peers: [], connecting: [], selectedPeerId: null, offers: [] }),

  addTransfer: (t) => set((s) => ({ transfers: [t, ...s.transfers] })),
  updateTransfer: (id, patch) =>
    set((s) => ({ transfers: s.transfers.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  removeTransfers: (ids) => set((s) => ({ transfers: s.transfers.filter((t) => !ids.includes(t.id)) })),

  upsertOffer: (offer) =>
    set((s) => ({
      offers: s.offers.some((o) => o.transferId === offer.transferId)
        ? s.offers.map((o) => (o.transferId === offer.transferId ? offer : o))
        : [...s.offers, offer],
    })),
  removeOffer: (transferId) => set((s) => ({ offers: s.offers.filter((o) => o.transferId !== transferId) })),

  addLog: (text, tone = 'info') =>
    set((s) => ({ log: [{ id: seq++, time: Date.now(), text, tone }, ...s.log].slice(0, MAX_LOG) })),
  clearLog: () => set({ log: [] }),
  toast: (text, tone = 'info') => {
    const id = seq++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
    window.setTimeout(() => get().dismissToast(id), tone === 'error' ? 6000 : 3800);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('nebula.theme', theme);
      } catch {
        /* storage blocked */
      }
      return { theme };
    }),
}));

/** Non-React access for the networking layer. */
export const store = () => useStore.getState();

/** Log to the activity feed and optionally pop a toast. */
export function notify(text: string, tone: LogTone = 'info', toast = true) {
  store().addLog(text, tone);
  if (toast) store().toast(text, tone);
}
