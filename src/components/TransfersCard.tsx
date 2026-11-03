import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Eye, Inbox, Trash2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Transfer } from '../store/types';
import { cancelTransfer, getFileBlob, removeTransfers, saveReceived } from '../lib/network';
import { friendlyName } from '../lib/identity';
import { fileExtension, formatBytes, formatDuration, formatPin, formatSpeed } from '../lib/format';
import { Button, Card, FileTile, Modal, Progress, Tile } from './ui';

type Filter = 'all' | 'in' | 'out';

const ACTIVE = new Set(['queued', 'offered', 'transferring']);
const TEXT_EXT = ['txt', 'md', 'csv', 'json', 'log', 'xml', 'yml', 'yaml', 'ini', 'js', 'ts', 'py', 'html', 'css', 'sh'];
const MAX_PREVIEW = 200 * 1024 * 1024;

function previewKind(t: Transfer): 'image' | 'video' | 'audio' | 'pdf' | 'text' | null {
  if (t.size > MAX_PREVIEW) return null;
  if (t.mime.startsWith('image/')) return 'image';
  if (t.mime.startsWith('video/')) return 'video';
  if (t.mime.startsWith('audio/')) return 'audio';
  if (t.mime === 'application/pdf') return 'pdf';
  if (t.mime.startsWith('text/') || TEXT_EXT.includes(fileExtension(t.name))) return 'text';
  return null;
}

function statusTag(t: Transfer) {
  const out = t.direction === 'out';
  switch (t.status) {
    case 'queued':
      return <span className="tag tag--peach">Queued</span>;
    case 'offered':
      return <span className="tag tag--sky">{out ? 'Waiting for OK' : 'Pending'}</span>;
    case 'transferring':
      return <span className="tag">{out ? 'Sending' : 'Receiving'}</span>;
    case 'done':
      return <span className="tag tag--mint">{out ? 'Sent' : t.saved ? 'Saved' : 'Received'}</span>;
    case 'declined':
      return <span className="tag tag--danger">Declined</span>;
    case 'cancelled':
      return <span className="tag tag--peach">Cancelled</span>;
    case 'failed':
      return <span className="tag tag--danger">Failed</span>;
  }
}

function TransferItem({ t, onPreview }: { t: Transfer; onPreview: (t: Transfer) => void }) {
  const active = ACTIVE.has(t.status);
  const pct = t.size > 0 ? (t.bytes / t.size) * 100 : t.status === 'done' ? 100 : 0;
  const eta = t.speed > 0 ? (t.size - t.bytes) / t.speed : NaN;
  const peerName = friendlyName(t.peerId);
  const kind = previewKind(t);

  return (
    <li className="transfer">
      <div className="transfer-top">
        <FileTile name={t.name} mime={t.mime} />
        <div className="transfer-info">
          <div className="transfer-name" title={t.name}>
            {t.name}
          </div>
          <div className="transfer-meta">
            {statusTag(t)}
            <span className="dir" title={peerName}>
              {t.direction === 'out' ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
              <span className="ellipsis">
                {formatBytes(t.size)} · {t.direction === 'out' ? 'to' : 'from'} {peerName}
              </span>
            </span>
          </div>
        </div>
        <div className="transfer-actions">
          {t.direction === 'in' && t.status === 'done' && (
            <>
              {kind && (
                <Button variant="ghost" size="sm" iconOnly onClick={() => onPreview(t)} aria-label={`Preview ${t.name}`} title="Preview">
                  <Eye size={17} />
                </Button>
              )}
              <Button variant="mint" size="sm" iconOnly onClick={() => saveReceived(t)} aria-label={`Save ${t.name}`} title="Save to device">
                <Download size={17} />
              </Button>
            </>
          )}
          {active ? (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              className="btn--soft-danger"
              onClick={() => cancelTransfer(t.id)}
              aria-label={`Cancel ${t.name}`}
              title="Cancel"
            >
              <X size={17} />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" iconOnly onClick={() => removeTransfers([t.id])} aria-label={`Remove ${t.name}`} title="Remove from list">
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </div>

      {t.status === 'offered' && t.direction === 'out' && t.pin && (
        <div className="pin-callout">
          <Tile color="lemon" size="sm">
            <span style={{ fontWeight: 900, fontSize: 13 }}>PIN</span>
          </Tile>
          <div>
            <p>Tell {peerName} to enter</p>
            <strong aria-label={`PIN ${t.pin.split('').join(' ')}`}>{formatPin(t.pin)}</strong>
          </div>
        </div>
      )}
      {t.status === 'offered' && t.direction === 'out' && !t.pin && (
        <p className="hint">Waiting for {peerName} to accept…</p>
      )}

      {t.status === 'transferring' && (
        <>
          <Progress value={pct} />
          <div className="progress-stats">
            <span>
              {Math.floor(pct)}% · {formatBytes(t.bytes)} of {formatBytes(t.size)}
            </span>
            <span>
              {formatSpeed(t.speed)} · {Number.isFinite(eta) ? `${formatDuration(eta)} left` : 'starting…'}
            </span>
          </div>
        </>
      )}

      {t.status === 'done' && t.startedAt && t.finishedAt && (
        <div className="progress-stats" style={{ marginTop: 10 }}>
          <span>Avg {formatSpeed(t.speed)}</span>
          <span>took {formatDuration((t.finishedAt - t.startedAt) / 1000)}</span>
        </div>
      )}

      {(t.status === 'failed' || t.status === 'cancelled') && t.error && (
        <p className={`hint ${t.status === 'failed' ? 'hint--error' : ''}`}>{t.error}</p>
      )}
    </li>
  );
}

function PreviewModal({ transfer, onClose }: { transfer: Transfer | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const kind = transfer ? previewKind(transfer) : null;

  useEffect(() => {
    if (!transfer) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setText(null);
    setError(null);
    getFileBlob(transfer)
      .then(async (blob) => {
        if (cancelled) return;
        if (kind === 'text') {
          const content = await blob.slice(0, 512 * 1024).text();
          if (!cancelled) setText(content);
        } else {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Could not open the file'));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [transfer, kind]);

  return (
    <Modal open={!!transfer} onClose={onClose} wide label="File preview">
      {transfer && (
        <>
          <h2 style={{ paddingRight: 48, overflowWrap: 'anywhere' }}>{transfer.name}</h2>
          <p className="sub">
            {formatBytes(transfer.size)} from {friendlyName(transfer.peerId)}
          </p>
          <div className="preview-body">
            {error && <p className="hint hint--error">{error}</p>}
            {!error && !url && text === null && <span className="spinner" style={{ color: 'var(--primary)' }} />}
            {url && kind === 'image' && <img src={url} alt={transfer.name} />}
            {url && kind === 'video' && <video src={url} controls autoPlay playsInline />}
            {url && kind === 'audio' && <audio src={url} controls autoPlay style={{ width: '100%' }} />}
            {url && kind === 'pdf' && <iframe src={url} title={transfer.name} />}
            {text !== null && <pre>{text}</pre>}
          </div>
          <div className="modal-actions">
            <Button variant="mint" icon={<Download size={18} />} onClick={() => saveReceived(transfer)}>
              Save to device
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function TransfersCard() {
  const transfers = useStore((s) => s.transfers);
  const [filter, setFilter] = useState<Filter>('all');
  const [preview, setPreview] = useState<Transfer | null>(null);

  const shown = transfers.filter((t) => filter === 'all' || t.direction === filter);
  const finished = transfers.filter((t) => !ACTIVE.has(t.status)).map((t) => t.id);
  const activeCount = transfers.length - finished.length;

  return (
    <Card
      title="Transfers"
      subtitle={activeCount > 0 ? `${activeCount} in progress` : 'Everything you sent and received'}
      icon={<Inbox size={21} strokeWidth={2.4} />}
      iconColor="mint"
      extra={
        finished.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => removeTransfers(finished)} title="Remove finished transfers">
            Clear
          </Button>
        )
      }
    >
      <div className="segmented" role="group" aria-label="Filter transfers" style={{ marginBottom: 16 }}>
        {(
          [
            ['all', 'All'],
            ['in', 'Received'],
            ['out', 'Sent'],
          ] as const
        ).map(([key, label]) => (
          <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <Tile color="sky" size="lg">
            <Inbox size={26} />
          </Tile>
          <h3>{filter === 'out' ? 'Nothing sent yet' : filter === 'in' ? 'Nothing received yet' : 'No transfers yet'}</h3>
          <p>Files you send or receive show up here with live progress.</p>
        </div>
      ) : (
        <ul className="transfer-list">
          {shown.map((t) => (
            <TransferItem key={t.id} t={t} onPreview={setPreview} />
          ))}
        </ul>
      )}

      <PreviewModal transfer={preview} onClose={() => setPreview(null)} />
    </Card>
  );
}
