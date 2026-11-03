import { useState, type FormEvent } from 'react';
import { ArrowRight, Link as LinkIcon, QrCode, Unplug, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import { connectTo, disconnectPeer } from '../lib/network';
import { friendlyName, shortId } from '../lib/identity';
import { Button, Card, PeerAvatar } from './ui';
import ScannerModal from './ScannerModal';

export default function ConnectCard() {
  const status = useStore((s) => s.status);
  const peers = useStore((s) => s.peers);
  const connecting = useStore((s) => s.connecting);
  const [value, setValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const online = status === 'online' || status === 'reconnecting';

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!value.trim()) return;
    const ok = await connectTo(value);
    if (ok) setValue('');
  };

  return (
    <Card
      title="Connect a device"
      subtitle="Type their ID or scan their QR code"
      icon={<LinkIcon size={21} strokeWidth={2.4} />}
      iconColor="sky"
    >
      <form onSubmit={submit}>
        <label htmlFor="peer-id" className="sr-only">
          Device ID
        </label>
        <div className="field field--mono">
          <input
            id="peer-id"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. k3x9-qp7m"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={!online}
          />
          <Button
            variant="ghost"
            iconOnly
            onClick={() => setScanning(true)}
            disabled={!online}
            aria-label="Scan QR code"
            title="Scan QR code"
          >
            <QrCode size={20} />
          </Button>
          <Button type="submit" variant="primary" iconOnly disabled={!online || !value.trim()} aria-label="Connect">
            <ArrowRight size={20} />
          </Button>
        </div>
      </form>

      <div className="section-label">
        <span>
          Linked devices <span className="count">{peers.length}</span>
        </span>
      </div>

      {peers.length === 0 && connecting.length === 0 ? (
        <div className="empty" style={{ padding: '10px 8px 4px' }}>
          <span className="tile tile--lemon tile--lg">
            <Users size={26} />
          </span>
          <p>No devices yet. Connect to one, or let them connect to you.</p>
        </div>
      ) : (
        <ul className="peer-list">
          {connecting
            .filter((id) => !peers.some((p) => p.id === id))
            .map((id) => (
              <li key={`c-${id}`} className="peer" aria-busy="true">
                <PeerAvatar id={id} />
                <div className="peer-main">
                  <div className="peer-name">{friendlyName(id)}</div>
                  <div className="peer-meta">Connecting…</div>
                </div>
                <span className="spinner" style={{ color: 'var(--primary)', marginRight: 12 }} aria-hidden="true" />
              </li>
            ))}
          {peers.map((p) => (
            <li key={p.id} className="peer">
              <PeerAvatar id={p.id} />
              <div className="peer-main">
                <div className="peer-name">{p.name}</div>
                <div className="peer-meta">
                  {p.device ? `${p.device} · ` : ''}
                  <code>{shortId(p.id)}</code>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className="btn--soft-danger"
                onClick={() => disconnectPeer(p.id)}
                aria-label={`Disconnect ${p.name}`}
                title="Disconnect"
              >
                <Unplug size={17} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ScannerModal
        open={scanning}
        onClose={() => setScanning(false)}
        onResult={(text) => {
          setScanning(false);
          void connectTo(text);
        }}
      />
    </Card>
  );
}
