import type { PeerOptions } from 'peerjs';

/** Largest single file the app will offer to send. */
export const MAX_FILE_SIZE_GB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_GB * 1024 ** 3;

/** Size of each chunk written to the data channel. */
export const CHUNK_SIZE = 256 * 1024;

/** How many chunks may be in flight (sent but not yet acknowledged). */
export const SEND_WINDOW = 8;

/** Give up on a connection attempt after this long. */
export const CONNECT_TIMEOUT_MS = 15_000;

/** Wrong PIN attempts allowed before the sender cancels the transfer. */
export const MAX_PIN_ATTEMPTS = 3;

/**
 * Optional self-hosted PeerJS signalling server. Leave the env vars unset to use the
 * free PeerJS cloud server. Example `.env.local`:
 *   VITE_PEER_HOST=peer.example.com
 *   VITE_PEER_PORT=443
 *   VITE_PEER_PATH=/
 *   VITE_PEER_SECURE=true
 */
export function peerServerOptions(): PeerOptions {
  const env = import.meta.env;
  const options: PeerOptions = { debug: 1 };
  if (env.VITE_PEER_HOST) {
    options.host = env.VITE_PEER_HOST;
    if (env.VITE_PEER_PORT) options.port = Number(env.VITE_PEER_PORT);
    if (env.VITE_PEER_PATH) options.path = env.VITE_PEER_PATH;
    options.secure = env.VITE_PEER_SECURE ? env.VITE_PEER_SECURE === 'true' : location.protocol === 'https:';
  }
  return options;
}
