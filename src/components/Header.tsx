import { Moon, Orbit, Sun } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { SessionStatus } from '../store/types';

const STATUS_LABEL: Record<SessionStatus, string> = {
  idle: 'Offline',
  connecting: 'Connecting…',
  online: 'Online',
  reconnecting: 'Reconnecting…',
  error: 'Offline',
};

export default function Header() {
  const status = useStore((s) => s.status);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const peerCount = useStore((s) => s.peers.length);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-logo" aria-hidden="true">
          <Orbit size={26} strokeWidth={2.4} />
        </span>
        <div>
          <div className="brand-name">
            Nebula<em>Transfer</em>
          </div>
          <div className="brand-tag">Private device-to-device file sharing</div>
        </div>
      </div>
      <div className="topbar-spacer" />
      <div className="status-pill" data-status={status} role="status" aria-live="polite">
        <span className="status-dot" aria-hidden="true" />
        <span className="status-label">
          {STATUS_LABEL[status]}
          {status === 'online' && peerCount > 0 && ` · ${peerCount} linked`}
        </span>
        <span className="sr-only">{STATUS_LABEL[status]}</span>
      </div>
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        <span className="knob">{theme === 'dark' ? <Moon size={17} strokeWidth={2.6} /> : <Sun size={17} strokeWidth={2.6} />}</span>
      </button>
    </header>
  );
}
