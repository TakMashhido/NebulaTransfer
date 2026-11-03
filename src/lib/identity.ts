// Short, easy-to-type peer IDs and friendly device names derived from them.

const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o, 1/l/i
const ID_PREFIX = 'nebula-';
const STORAGE_KEY = 'nebula.peerId';

function randomChars(count: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(count));
  return Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
}

export function generatePeerId(): string {
  return `${ID_PREFIX}${randomChars(4)}-${randomChars(4)}`;
}

export function loadPeerId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && /^[a-z0-9-]{6,64}$/.test(stored)) return stored;
  } catch {
    /* storage blocked */
  }
  return savePeerId(generatePeerId());
}

export function savePeerId(id: string): string {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage blocked */
  }
  return id;
}

/** The part users actually read, e.g. "nebula-k3x9-qp7m" -> "k3x9-qp7m". */
export function shortId(id: string): string {
  return id.startsWith(ID_PREFIX) ? id.slice(ID_PREFIX.length) : id;
}

/**
 * Accepts whatever a user pastes or scans: a full share link, a full ID or just the short part.
 * Returns the normalised peer ID, or null if nothing usable was found.
 */
export function parsePeerInput(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const fromUrl = url.searchParams.get('connect');
    if (fromUrl) value = fromUrl;
  } catch {
    /* not a URL */
  }
  value = value.trim().toLowerCase().replace(/\s+/g, '');
  if (/^[a-z0-9]{4}-[a-z0-9]{4}$/.test(value)) value = ID_PREFIX + value;
  return /^[a-z0-9][a-z0-9_-]{2,63}$/i.test(value) ? value : null;
}

export function shareLink(id: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('connect', id);
  return url.toString();
}

const ADJECTIVES = [
  'Amber', 'Bubbly', 'Cosmic', 'Dreamy', 'Fuzzy', 'Gentle', 'Happy', 'Jolly', 'Lucky', 'Mellow',
  'Minty', 'Peachy', 'Plucky', 'Rosy', 'Snug', 'Sunny', 'Swift', 'Velvet', 'Witty', 'Zesty',
];
const ANIMALS = [
  'Otter', 'Panda', 'Koala', 'Fox', 'Penguin', 'Bunny', 'Kitten', 'Owl', 'Seal', 'Hedgehog',
  'Dolphin', 'Llama', 'Duckling', 'Lemur', 'Puffin', 'Turtle', 'Squirrel', 'Raccoon', 'Moth', 'Whale',
];
export const PEER_COLORS = ['violet', 'pink', 'mint', 'sky', 'peach', 'lemon'] as const;
export type PeerColor = (typeof PEER_COLORS)[number];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function friendlyName(id: string): string {
  const h = hash(id);
  return `${ADJECTIVES[h % ADJECTIVES.length]} ${ANIMALS[Math.floor(h / ADJECTIVES.length) % ANIMALS.length]}`;
}

export function peerColor(id: string): PeerColor {
  return PEER_COLORS[hash(id + '#') % PEER_COLORS.length];
}

export function describeDevice(): string {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iOS'
      : /Mac OS X/i.test(ua)
        ? 'macOS'
        : /Windows/i.test(ua)
          ? 'Windows'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  return `${browser} on ${os}`;
}
