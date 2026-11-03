import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { hasActiveTransfers, initStorage, queueAutoConnect, startSession } from './lib/network';
import Header from './components/Header';
import Hero from './components/Hero';
import IdentityCard from './components/IdentityCard';
import ConnectCard from './components/ConnectCard';
import SendCard from './components/SendCard';
import TransfersCard from './components/TransfersCard';
import ActivityCard from './components/ActivityCard';
import OfferModal from './components/OfferModal';
import Toasts from './components/Toasts';

let booted = false;

export default function App() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#17162b' : '#eceffb');
  }, [theme]);

  useEffect(() => {
    // StrictMode mounts effects twice in development; the session must only start once.
    if (booted) return;
    booted = true;

    const params = new URLSearchParams(window.location.search);
    const target = params.get('connect');
    if (target) {
      params.delete('connect');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    }

    void initStorage().then(() => {
      startSession();
      if (target) queueAutoConnect(target);
    });
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasActiveTransfers()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return (
    <>
      <div className="backdrop" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="shell">
        <Header />
        <main>
          <Hero />
          <div className="layout">
            <div className="column column--left">
              <IdentityCard />
            </div>
            <div className="column column--center">
              <ConnectCard />
              <SendCard />
            </div>
            <div className="column column--right">
              <TransfersCard />
              <ActivityCard />
            </div>
          </div>
        </main>
        <footer className="footer">
          Files go directly between browsers over an encrypted WebRTC channel - nothing is uploaded to a server.
          <br />
          NebulaTransfer © {new Date().getFullYear()} ·{' '}
          <a href="https://github.com/TakMashhido/NebulaTransfer" target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </footer>
      </div>
      <OfferModal />
      <Toasts />
    </>
  );
}
