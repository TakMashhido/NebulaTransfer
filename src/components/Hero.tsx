import { HardDrive, ShieldCheck, UserX, Zap } from 'lucide-react';
import { MAX_FILE_SIZE_GB } from '../lib/config';
import { Tile } from './ui';

export default function Hero() {
  return (
    <section className="hero" aria-label="About NebulaTransfer">
      <div>
        <h1>
          Send files straight to <span className="accent">any device</span>, no cloud in between.
        </h1>
        <p>Open NebulaTransfer on both devices, link them with an ID or QR code, and drop your files in.</p>
      </div>
      <ul className="hero-badges">
        <li className="badge">
          <Tile color="mint"><ShieldCheck size={16} strokeWidth={2.6} /></Tile>
          Encrypted in transit
        </li>
        <li className="badge">
          <Tile color="sky"><Zap size={16} strokeWidth={2.6} /></Tile>
          Direct peer-to-peer
        </li>
        <li className="badge">
          <Tile color="peach"><HardDrive size={16} strokeWidth={2.6} /></Tile>
          Up to {MAX_FILE_SIZE_GB} GB
        </li>
        <li className="badge">
          <Tile color="pink"><UserX size={16} strokeWidth={2.6} /></Tile>
          No sign-up
        </li>
      </ul>
    </section>
  );
}
