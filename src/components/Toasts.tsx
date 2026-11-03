import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { LogTone } from '../store/types';
import { Button, Tile, type TileColor } from './ui';

const LOOK: Record<LogTone, { color: TileColor; Icon: typeof Info }> = {
  info: { color: 'sky', Icon: Info },
  success: { color: 'mint', Icon: CheckCircle2 },
  warning: { color: 'lemon', Icon: AlertTriangle },
  error: { color: 'danger', Icon: XCircle },
};

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="toasts" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => {
        const { color, Icon } = LOOK[t.tone];
        return (
          <div key={t.id} className="toast" role={t.tone === 'error' ? 'alert' : 'status'}>
            <Tile color={color} size="sm">
              <Icon size={17} strokeWidth={2.6} />
            </Tile>
            <p>{t.text}</p>
            <Button variant="ghost" size="sm" iconOnly onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={16} />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
