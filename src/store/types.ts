export type SessionStatus = 'idle' | 'connecting' | 'online' | 'reconnecting' | 'error';

export interface PeerInfo {
  id: string;
  name: string;
  device?: string;
  connectedAt: number;
}

export type TransferStatus =
  | 'queued' // sender: waiting its turn
  | 'offered' // waiting for the other side to accept / type the PIN
  | 'transferring'
  | 'done'
  | 'declined'
  | 'cancelled'
  | 'failed';

export interface Transfer {
  id: string;
  direction: 'out' | 'in';
  peerId: string;
  name: string;
  size: number;
  mime: string;
  chunks: number;
  status: TransferStatus;
  /** Bytes confirmed (sender: acknowledged, receiver: stored). */
  bytes: number;
  /** Current speed in bytes/s, smoothed. */
  speed: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  /** Sender side: PIN the receiver must type. */
  pin?: string;
  error?: string;
  /** Receiver side: the user already saved this file. */
  saved?: boolean;
}

export interface IncomingOffer {
  transferId: string;
  peerId: string;
  name: string;
  size: number;
  mime: string;
  chunks: number;
  pinRequired: boolean;
  attemptsLeft: number;
  wrongPin?: boolean;
  /** Answer sent, waiting for the sender to confirm the PIN. */
  verifying?: boolean;
  receivedAt: number;
}

export type LogTone = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: number;
  time: number;
  text: string;
  tone: LogTone;
}

export interface Toast {
  id: number;
  text: string;
  tone: LogTone;
}

export type ThemeMode = 'light' | 'dark';
