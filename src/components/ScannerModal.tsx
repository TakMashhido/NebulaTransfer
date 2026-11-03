import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { CameraOff } from 'lucide-react';
import { Modal } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
}

export default function ScannerModal({ open, onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef(onResult);
  resultRef.current = onResult;

  useEffect(() => {
    if (!open) return;
    setError(null);
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && ctx && video.readyState >= video.HAVE_ENOUGH_DATA) {
        const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
        if (code?.data) {
          stopped = true;
          navigator.vibrate?.(60);
          resultRef.current(code.data);
          return;
        }
      }
      frame = window.setTimeout(() => requestAnimationFrame(tick), 120);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is not available in this browser. Paste the ID instead.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        tick();
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        setError(
          name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser settings, or paste the ID instead.'
            : name === 'NotFoundError'
              ? 'No camera was found on this device.'
              : 'Could not start the camera.',
        );
      }
    })();

    return () => {
      stopped = true;
      window.clearTimeout(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} label="Scan a QR code">
      <h2>Scan a QR code</h2>
      <p className="sub">Point your camera at the QR code shown on the other device.</p>
      {error ? (
        <div className="empty" style={{ marginTop: 12 }}>
          <span className="tile tile--danger tile--lg">
            <CameraOff size={26} />
          </span>
          <p style={{ maxWidth: 340 }}>{error}</p>
        </div>
      ) : (
        <div className="scanner">
          <video ref={videoRef} playsInline muted />
          <div className="scanner-frame" aria-hidden="true" />
        </div>
      )}
    </Modal>
  );
}
