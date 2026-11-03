import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  File, FileArchive, FileCode, FileSpreadsheet, FileText, Film, Image, Music, X, type LucideIcon,
} from 'lucide-react';
import { fileExtension } from '../lib/format';
import { friendlyName, peerColor } from '../lib/identity';

export type TileColor = 'violet' | 'pink' | 'mint' | 'sky' | 'peach' | 'lemon' | 'danger';

export function Tile({
  color, size, children, className = '',
}: { color: TileColor; size?: 'sm' | 'lg'; children: ReactNode; className?: string }) {
  return (
    <span className={`tile tile--${color} ${size ? `tile--${size}` : ''} ${className}`} aria-hidden="true">
      {children}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'mint' | 'danger' | 'ghost' | 'default';
  size?: 'sm' | 'lg';
  block?: boolean;
  icon?: ReactNode;
  loading?: boolean;
  iconOnly?: boolean;
};

export function Button({
  variant = 'default', size, block, icon, loading, iconOnly, className = '', children, disabled, type = 'button', ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    variant !== 'default' && `btn--${variant}`,
    size && `btn--${size}`,
    block && 'btn--block',
    iconOnly && 'btn--icon',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

export function Card({
  title, subtitle, icon, iconColor = 'violet', extra, children, className = '', labelledBy,
}: {
  title: string;
  subtitle?: ReactNode;
  icon: ReactNode;
  iconColor?: TileColor;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  const id = labelledBy ?? `card-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section className={`card ${className}`} aria-labelledby={id}>
      <header className="card-head">
        <Tile color={iconColor}>{icon}</Tile>
        <div className="grow">
          <h2 id={id}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {extra}
      </header>
      {children}
    </section>
  );
}

export function Modal({
  open, onClose, children, wide, label,
}: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const focusable = ref.current?.querySelector<HTMLElement>('[data-autofocus], input, button:not(.modal-close)');
    focusable?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  // Portal to <body>: cards use transforms, which would otherwise trap a fixed overlay inside them.
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
        <Button variant="ghost" size="sm" iconOnly className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </Button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Progress({ value, done }: { value: number; done?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`progress ${done ? 'progress--done' : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-bar" style={{ width: `calc(${pct}% - 4px)` }} />
    </div>
  );
}

export function PeerAvatar({ id, size }: { id: string; size?: 'sm' | 'lg' }) {
  const initials = friendlyName(id)
    .split(' ')
    .map((w) => w[0])
    .join('');
  return (
    <Tile color={peerColor(id)} size={size} className="avatar">
      {initials}
    </Tile>
  );
}

const ARCHIVES = ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'dmg', 'iso', 'apk'];
const CODE = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'html', 'css', 'json', 'xml', 'yml', 'yaml', 'sh'];
const SHEETS = ['xls', 'xlsx', 'csv', 'ods', 'numbers'];
const DOCS = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'pages', 'ppt', 'pptx', 'key'];

export function fileVisual(name: string, mime: string): { Icon: LucideIcon; color: TileColor } {
  const ext = fileExtension(name);
  if (mime.startsWith('image/')) return { Icon: Image, color: 'pink' };
  if (mime.startsWith('video/')) return { Icon: Film, color: 'peach' };
  if (mime.startsWith('audio/')) return { Icon: Music, color: 'mint' };
  if (ARCHIVES.includes(ext) || /zip|compressed|archive/.test(mime)) return { Icon: FileArchive, color: 'lemon' };
  if (SHEETS.includes(ext)) return { Icon: FileSpreadsheet, color: 'mint' };
  if (CODE.includes(ext)) return { Icon: FileCode, color: 'violet' };
  if (DOCS.includes(ext) || mime.startsWith('text/') || mime === 'application/pdf') return { Icon: FileText, color: 'sky' };
  return { Icon: File, color: 'violet' };
}

export function FileTile({ name, mime, size }: { name: string; mime: string; size?: 'sm' | 'lg' }) {
  const { Icon, color } = fileVisual(name, mime);
  return (
    <Tile color={color} size={size}>
      <Icon size={size === 'lg' ? 26 : size === 'sm' ? 17 : 21} strokeWidth={2.4} />
    </Tile>
  );
}
