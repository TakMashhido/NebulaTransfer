import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { Link as LinkIcon, QrCode, Send, Share2, UploadCloud, X } from 'lucide-react';
import { useStore, notify } from '../store/useStore';
import { sendFiles } from '../lib/network';
import { formatBytes } from '../lib/format';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_GB } from '../lib/config';
import { Button, Card, FileTile, PeerAvatar, Tile } from './ui';

const MAX_STAGED = 50;

export default function SendCard() {
  const peers = useStore((s) => s.peers);
  const selectedPeerId = useStore((s) => s.selectedPeerId);
  const selectPeer = useStore((s) => s.selectPeer);
  const [files, setFiles] = useState<File[]>([]);
  const [usePin, setUsePin] = useState(() => {
    try {
      return localStorage.getItem('nebula.usePin') !== 'false';
    } catch {
      return true;
    }
  });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const target = peers.find((p) => p.id === selectedPeerId) ?? null;
  const hasPeers = peers.length > 0;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const tooBig = incoming.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (tooBig.length) notify(`${tooBig.length} file(s) are over ${MAX_FILE_SIZE_GB} GB and were skipped.`, 'warning');
    setFiles((current) => {
      const key = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;
      const seen = new Set(current.map(key));
      const next = [...current];
      for (const f of incoming) {
        if (f.size > MAX_FILE_SIZE_BYTES || seen.has(key(f))) continue;
        seen.add(key(f));
        next.push(f);
      }
      if (next.length > MAX_STAGED) notify(`You can queue up to ${MAX_STAGED} files at a time.`, 'warning');
      return next.slice(0, MAX_STAGED);
    });
  };

  // Paste files from the clipboard (Ctrl/Cmd+V) while a device is linked.
  useEffect(() => {
    if (!hasPeers) return;
    const onPaste = (e: ClipboardEvent) => {
      const pasted = e.clipboardData?.files;
      if (pasted && pasted.length && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        addFiles(pasted);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [hasPeers]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (hasPeers) addFiles(e.dataTransfer.files);
  };

  const onDropzoneKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const send = () => {
    if (!target || files.length === 0) return;
    sendFiles(target.id, files, usePin);
    setFiles([]);
  };

  const togglePin = (on: boolean) => {
    setUsePin(on);
    try {
      localStorage.setItem('nebula.usePin', String(on));
    } catch {
      /* storage blocked */
    }
  };

  return (
    <Card
      title="Send files"
      subtitle={hasPeers ? 'Pick a device, add files, hit send' : 'Link a device to start sending'}
      icon={<Send size={20} strokeWidth={2.4} />}
      iconColor="pink"
    >
      {!hasPeers ? (
        <ol className="steps" aria-label="How it works">
          <li>
            <Tile color="violet"><Share2 size={19} /></Tile>
            <div>
              <strong>1. Share your ID</strong>
              <span>Send the link or show the QR code from “Your device”.</span>
            </div>
          </li>
          <li>
            <Tile color="sky"><QrCode size={19} /></Tile>
            <div>
              <strong>2. Link up</strong>
              <span>The other device opens the link, scans, or types your ID.</span>
            </div>
          </li>
          <li>
            <Tile color="mint"><UploadCloud size={19} /></Tile>
            <div>
              <strong>3. Drop your files</strong>
              <span>They travel straight between the two devices.</span>
            </div>
          </li>
        </ol>
      ) : (
        <>
          <div className="section-label" style={{ marginTop: 0 }}>
            <span>Send to</span>
          </div>
          <div className="target-list" role="group" aria-label="Choose a device">
            {peers.map((p) => (
              <button key={p.id} className="target" aria-pressed={p.id === selectedPeerId} onClick={() => selectPeer(p.id)}>
                <PeerAvatar id={p.id} />
                <span>
                  {p.name}
                  {p.device && <small>{p.device}</small>}
                </span>
              </button>
            ))}
          </div>

          <div
            className={`dropzone ${dragging ? 'is-dragging' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Add files: click, drop, or paste"
            onClick={() => inputRef.current?.click()}
            onKeyDown={onDropzoneKey}
            onDragEnter={(e) => {
              e.preventDefault();
              dragDepth.current++;
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => {
              dragDepth.current = Math.max(0, dragDepth.current - 1);
              if (dragDepth.current === 0) setDragging(false);
            }}
            onDrop={onDrop}
          >
            <div className="floaty">
              <Tile color="violet" size="lg">
                <UploadCloud size={28} strokeWidth={2.4} />
              </Tile>
            </div>
            <div>
              <h3>{dragging ? 'Drop to add' : 'Drop files here'}</h3>
              <p>or click to browse · paste works too · up to {MAX_FILE_SIZE_GB} GB each</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {files.length > 0 && (
            <>
              <div className="section-label">
                <span>
                  Ready to send <span className="count">{files.length}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                  Clear
                </Button>
              </div>
              <ul className="staged" style={{ marginTop: 0 }}>
                {files.map((f, i) => (
                  <li key={`${f.name}-${f.size}-${f.lastModified}`}>
                    <FileTile name={f.name} mime={f.type} size="sm" />
                    <div className="transfer-info">
                      <div className="transfer-name" title={f.name}>
                        {f.name}
                      </div>
                      <div className="transfer-meta">{formatBytes(f.size)}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}
                      aria-label={`Remove ${f.name}`}
                    >
                      <X size={16} />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="send-footer">
            <label className="switch">
              <input type="checkbox" checked={usePin} onChange={(e) => togglePin(e.target.checked)} />
              <span className="switch-track" aria-hidden="true" />
              <span className="switch-text">
                <strong>Protect with PIN</strong>
                <span>Receiver types a 6-digit code you read out</span>
              </span>
            </label>
            <Button
              variant="primary"
              size="lg"
              icon={<Send size={19} />}
              onClick={send}
              disabled={!target || files.length === 0}
            >
              {files.length === 0
                ? 'Add files to send'
                : `Send ${files.length > 1 ? `${files.length} files` : ''} · ${formatBytes(totalSize)}`}
            </Button>
          </div>
          {!target && (
            <p className="hint" role="note">
              <LinkIcon size={13} style={{ verticalAlign: '-2px' }} /> Choose which device to send to.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
