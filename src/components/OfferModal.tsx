import { useEffect, useState, type FormEvent } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { acceptOffer, declineOffer } from '../lib/network';
import { friendlyName } from '../lib/identity';
import { formatBytes } from '../lib/format';
import { Button, FileTile, Modal, PeerAvatar } from './ui';

/** Shows incoming file requests one at a time. */
export default function OfferModal() {
  const offer = useStore((s) => s.offers[0]);
  const queued = useStore((s) => s.offers.length);
  const [pin, setPin] = useState('');
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => setPin(''), [offer?.transferId]);
  useEffect(() => {
    if (offer?.wrongPin) {
      setPin('');
      setShakeKey((k) => k + 1);
    }
  }, [offer?.wrongPin, offer?.attemptsLeft]);

  if (!offer) return null;
  const name = friendlyName(offer.peerId);
  const digits = pin.replace(/\D/g, '');
  const canAccept = !offer.verifying && (!offer.pinRequired || digits.length === 6);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canAccept) void acceptOffer(offer.transferId, offer.pinRequired ? digits : undefined);
  };

  return (
    <Modal open onClose={() => declineOffer(offer.transferId)} label="Incoming file">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 40 }}>
        <PeerAvatar id={offer.peerId} size="lg" />
        <div>
          <h2>Incoming file</h2>
          <p className="sub" style={{ margin: 0 }}>
            <strong>{name}</strong> wants to send you
            {queued > 1 && ` (+${queued - 1} more waiting)`}
          </p>
        </div>
      </div>

      <div className="offer-file">
        <FileTile name={offer.name} mime={offer.mime} size="lg" />
        <div style={{ minWidth: 0 }}>
          <div className="name">{offer.name}</div>
          <div className="meta">
            {formatBytes(offer.size)}
            {offer.mime ? ` · ${offer.mime}` : ''}
          </div>
        </div>
      </div>

      <form onSubmit={submit}>
        {offer.pinRequired && (
          <>
            <label htmlFor="pin" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, marginBottom: 10 }}>
              <ShieldCheck size={18} color="var(--mint)" /> Enter the 6-digit PIN shown on {name}
            </label>
            <input
              key={shakeKey}
              id="pin"
              data-autofocus
              className={`pin-input ${shakeKey ? 'shake' : ''}`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^\d ]/g, ''))}
              aria-invalid={offer.wrongPin || undefined}
              aria-describedby="pin-hint"
              disabled={offer.verifying}
            />
            <p id="pin-hint" className={`hint ${offer.wrongPin ? 'hint--error' : ''}`} role={offer.wrongPin ? 'alert' : undefined}>
              {offer.wrongPin
                ? `Wrong PIN - ${offer.attemptsLeft} attempt${offer.attemptsLeft === 1 ? '' : 's'} left.`
                : 'The PIN keeps strangers from pushing files to you.'}
            </p>
          </>
        )}
        {!offer.pinRequired && (
          <p className="hint">Only accept files from people you know.</p>
        )}

        <div className="modal-actions">
          <Button onClick={() => declineOffer(offer.transferId)} disabled={offer.verifying}>
            Decline
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={offer.verifying ? undefined : <Check size={18} />}
            loading={offer.verifying}
            disabled={!canAccept}
            data-autofocus={offer.pinRequired ? undefined : true}
          >
            {offer.verifying ? 'Checking…' : 'Accept'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
