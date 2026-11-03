import { Activity } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatTime } from '../lib/format';
import { Button, Card } from './ui';

export default function ActivityCard() {
  const log = useStore((s) => s.log);
  const clear = useStore((s) => s.clearLog);
  return (
    <Card
      title="Activity"
      subtitle="What happened this session"
      icon={<Activity size={20} strokeWidth={2.4} />}
      iconColor="peach"
      extra={
        log.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
        )
      }
    >
      {log.length === 0 ? (
        <p className="hint" style={{ margin: 0 }}>Nothing yet.</p>
      ) : (
        <ul className="log" aria-live="off">
          {log.map((entry) => (
            <li key={entry.id}>
              <span className={`dot dot--${entry.tone}`} aria-hidden="true" />
              <time dateTime={new Date(entry.time).toISOString()}>{formatTime(entry.time)}</time>
              <span>{entry.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
