import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, Check, Copy, Link2, Power, RefreshCw, Share2, Smartphone } from 'lucide-react';
import { useStore, notify } from '../store/useStore';
import { describeDevice, friendlyName, shareLink, shortId } from '../lib/identity';
import { copyText } from '../lib/clipboard';
import { restartWithNewId, startSession, stopSession } from '../lib/network';
import { Button, Card, PeerAvatar } from './ui';

export default function IdentityCard() {
  const myId = useStore((s) => s.myId);
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.sessionError);
  const theme = useStore((s) => s.theme);
  const transfersActive = useStore((s) => s.transfers.some((t) => t.status === 'transferring' || t.status === 'offered'));
  const [copied, setCopied] = useState<'id' | 'link' | null>(null);

  const ready = myId && (status === 'online' || status === 'reconnecting');
  const link = myId ? shareLink(myId) : '';

  const copy = async (what: 'id' | 'link') => {
    if (!myId) return;
    const ok = await copyText(what === 'id' ? shortId(myId) : link);
    if (ok) {
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1600);
    } else {
      notify('Copy failed - select the text and copy it manually.', 'warning');
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'NebulaTransfer', text: 'Connect to my device on NebulaTransfer', url: link });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const confirmIfBusy = (action: () => void, verb: string) => {
    if (!transfersActive || window.confirm(`Transfers are still running. ${verb} anyway?`)) action();
  };

  return (
    <Card
      title="Your device"
      subtitle="Share this so others can reach you"
      icon={<Smartphone size={21} strokeWidth={2.4} />}
      iconColor="violet"
    >
      {status === 'connecting' && (
        <div aria-busy="true" aria-label="Going online">
          <div className="me">
            <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 20 }} />
            <div style={{ flex: 1, display: 'grid', gap: 8 }}>
              <div className="skeleton" style={{ height: 18, width: '60%' }} />
              <div className="skeleton" style={{ height: 14, width: '40%' }} />
            </div>
          </div>
          <div className="skeleton" style={{ height: 62, borderRadius: 26 }} />
          <div className="qr-wrap">
            <div className="skeleton" style={{ width: 196, height: 196, borderRadius: 26 }} />
          </div>
        </div>
      )}

      {(status === 'idle' || status === 'error') && (
        <div className="empty">
          {status === 'error' && error ? (
            <div className="notice" role="alert" style={{ textAlign: 'left', marginBottom: 12 }}>
              <AlertCircle size={18} color="var(--danger)" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              <h3>You are offline</h3>
              <p>Go online to get an ID other devices can connect to.</p>
            </>
          )}
          <Button variant="primary" size="lg" icon={<Power size={19} />} onClick={() => startSession()} style={{ marginTop: 10 }}>
            {status === 'error' ? 'Try again' : 'Go online'}
          </Button>
        </div>
      )}

      {ready && myId && (
        <>
          <div className="me">
            <PeerAvatar id={myId} size="lg" />
            <div style={{ minWidth: 0 }}>
              <div className="me-name">{friendlyName(myId)}</div>
              <div className="me-device">This device · {describeDevice()}</div>
            </div>
          </div>

          <div className="id-well">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">Your ID</div>
              <div className="id-value" title={myId}>
                {shortId(myId)}
              </div>
            </div>
            <Button
              variant="primary"
              iconOnly
              onClick={() => copy('id')}
              aria-label="Copy your ID"
              title="Copy ID"
            >
              {copied === 'id' ? <Check size={19} /> : <Copy size={19} />}
            </Button>
          </div>

          <div className="qr-wrap">
            <div className="qr">
              <QRCodeSVG
                value={link}
                size={164}
                level="M"
                bgColor="#ffffff"
                fgColor={theme === 'dark' ? '#25234a' : '#2c2950'}
                aria-label="QR code with your connection link"
              />
            </div>
            <div className="qr-caption">Scan with a phone camera to connect instantly</div>
          </div>

          <div className="button-row">
            <Button icon={copied === 'link' ? <Check size={17} /> : <Link2 size={17} />} onClick={() => copy('link')}>
              {copied === 'link' ? 'Copied!' : 'Copy link'}
            </Button>
            {typeof navigator.share === 'function' && (
              <Button icon={<Share2 size={17} />} onClick={share}>
                Share
              </Button>
            )}
          </div>
          <div className="button-row" style={{ marginTop: 12 }}>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={15} />}
              onClick={() => confirmIfBusy(restartWithNewId, 'Get a new ID')}
            >
              New ID
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="btn--soft-danger"
              icon={<Power size={15} />}
              onClick={() => confirmIfBusy(stopSession, 'Go offline')}
            >
              Go offline
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
