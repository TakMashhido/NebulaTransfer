import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layout,
  Row,
  Col,
  message,
  UploadFile,
  // Removed other Ant Design components that are now in child components
} from 'antd';
// QrScanner is now encapsulated within ConnectionCard, so it's not directly needed here unless there's a global modal instance.
// For this refactor, assuming ConnectionCard handles its own QrScanner modal.
// import QrScanner from 'react-qr-scanner';


import { useAppDispatch, useAppSelector } from "./store/hooks";
import { startPeer, stopPeerSession } from "./store/peer/peerActions";
import * as connectionAction from "./store/connection/connectionActions";
import { PeerConnection } from "./helpers/peer"; // Used for handleStopSession, handleUpload
import { assembleFile } from "./helpers/fileCache"; // Used for handleDownload (now in ReceivedFilesCard)
import { useAsyncState } from "./helpers/hooks"; // For fileList, sendLoading
import download from "js-file-download"; // Used for handleDownload (now in ReceivedFilesCard)
import { ReceivedFile } from "./store/connection/connectionTypes"; // Type for handleDownload (now in ReceivedFilesCard)
// formatSpeed might be used in SendFileCard or ReceivedFilesCard if they display speed directly.
// import { formatSpeed } from "./helpers/format";

// Import new components
import MainHeader from './components/MainHeader';
import MainFooter from './components/MainFooter';
import SessionInfoCard from './components/SessionInfoCard';
import ConnectionCard from './components/ConnectionCard';
import ConnectionsListCard from './components/ConnectionsListCard';
import SendFileCard from './components/SendFileCard';
import ReceivedFilesCard from './components/ReceivedFilesCard';
// LogViewer is not part of this refactor scope based on the prompt, but if it were, it'd be imported.
// import { LogViewer } from './components/LogViewer';

const { Content } = Layout; // Layout.Content is still used

export const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const peerStoreState = useAppSelector((state) => state.peer); // For peer.started, peer.id, peer.loading
  const connectionStoreState = useAppSelector((state) => state.connection); // For connection.id, connection.loading, connection.list, connection.selectedId

  // App-level state that needs to be passed down or affects multiple components
  const [fileList, setFileList] = useAsyncState<UploadFile[]>([]);
  const [sendLoading, setSendLoading] = useAsyncState<boolean>(false);
  const [sendInfo, setSendInfo] = useState<{ sent: number, total: number, speed: number, remaining: number } | null>(null);
  const [sendProgress, setSendProgress] = useState(0); // For SendFileCard visual
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // QR Scanner state is now managed within ConnectionCard.tsx
  // const [scanOpen, setScanOpen] = useState(false);

  const downloadedRef = useRef<Set<string>>(new Set()); // Remains for handling download side effects

  // Peer session handlers remain in App.tsx as they manage the core PeerConnection object
  const handleStartSession = () => {
    dispatch(startPeer());
  };

  const handleStopSession = async () => {
    await PeerConnection.closePeerSession(); // This likely interacts with PeerJS object directly
    dispatch(stopPeerSession());
    // Reset app-level states related to connections/sending if necessary
    setFileList([]);
    setSendLoading(false);
    setSendInfo(null);
    setSendProgress(0);
    // Selected connection ID might also need reset if active connection is closed
    // dispatch(connectionAction.selectItem(null)); // Or however selection is cleared
  };

  // Connection handler remains in App.tsx
  const handleConnectOtherPeer = (targetId?: string) => {
    const idToConnect = targetId ?? connectionStoreState.id; // id from connection input field
    if (idToConnect) {
      dispatch(connectionAction.connectPeer(idToConnect));
    } else {
      message.warning("Please enter a Peer ID to connect.");
    }
  };

  const handleDisconnectPeer = (peerId: string) => {
    PeerConnection.disconnectPeer(peerId);
    dispatch(connectionAction.removeConnectionList(peerId));
  };

  // File upload handler remains in App.tsx as it uses PeerConnection
  const handleUpload = async (selectedTargetId: string) => {
    if (fileList.length === 0) {
      message.warning("Please select a file to send.");
      return;
    }
    if (!selectedTargetId) { // Changed from connection.selectedId to use passed prop
      message.warning("Please select a connection to send the file to.");
      return;
    }
    try {
      await setSendLoading(true);
      setSendProgress(0); // Reset progress before new send
      let file = fileList[0] as unknown as File; // Assuming single file upload

      await PeerConnection.sendFileWithPin(selectedTargetId, file, (sent, total, speed, remaining) => {
        setSendInfo({ sent, total, speed, remaining });
        setSendProgress(Math.round((sent / total) * 100));
      });

      await setSendLoading(false);
      setSendInfo(null); // Clear info after success
      setFileList([]); // Clear file list
      message.success("File sent successfully!");
    } catch (err: any) {
      await setSendLoading(false);
      console.error("Error sending file:", err);
      message.error(err?.message || "Error when sending file.");
      // Update sendInfo to show error in the card
      setSendInfo({sent:0, total:0, speed:0, remaining:0}); // Or a specific error structure
      // Consider adding an error message to sendInfo state for display in SendFileCard
    }
  };

  // Effect for handling received files and triggering downloads (now managed by ReceivedFilesCard)
  // This logic is moved to ReceivedFilesCard.tsx
  // useEffect(() => {
  //   connectionStoreState.receivedFiles.forEach(f => {
  //     if (f.ready && !downloadedRef.current.has(f.id)) {
  //       downloadedRef.current.add(f.id);
  //       // const handleDownload = async (file: ReceivedFile) => { ... } moved
  //       // handleDownload(f);
  //     }
  //   })
  // }, [connectionStoreState.receivedFiles]);

  // Callback for ConnectionCard to open QR scanner modal.
  // This state is now internal to ConnectionCard.
  // const openQrScanner = () => setScanOpen(true);

  // Callback for ConnectionCard's QrScanner onScan result.
  // This logic is now internal to ConnectionCard.
  // const onQrScanResult = (data: any) => { ... }


  return (
    <Layout style={{ minHeight: '100vh' }}> {/* Removed hardcoded background */}
      <MainHeader />
      <Content style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* NebulaTransfer Title Card - can be a simple Typography.Title or its own component if complex */}
        <Row justify="center" style={{ marginBottom: 24 }}>
            <Col>
                {/* Removed the outer Card, title can be part of MainHeader or a specific Title component if needed */}
                {/* <Typography.Title level={2} style={{ textAlign: "center", color: "white" }}>NebulaTransfer</Typography.Title> */}
            </Col>
        </Row>
        <Row gutter={[16, 16]} justify="center">
          <Col xs={24} sm={24} md={8}>
            <SessionInfoCard
              // Props passed to SessionInfoCard
              // peerId={peerStoreState.id} // Handled by SessionInfoCard's useSelector
              // isLoading={peerStoreState.loading} // Handled by SessionInfoCard's useSelector
              // error={null} // Assuming peer store has an error field, handled by SessionInfoCard's useSelector
              onStartSession={handleStartSession} // Pass the handler
              onStopSession={handleStopSession} // Pass the handler
              // qrCodeValue={peerStoreState.id || ''} // Handled by SessionInfoCard's useSelector
              isSessionStarted={peerStoreState.started}
            />
            {peerStoreState.started && (
              <>
                <ConnectionCard
                  disabled={connectionStoreState.loading}
                  onConnect={handleConnectOtherPeer}
                  // scanOpen={scanOpen} // Managed internally by ConnectionCard
                  // setScanOpen={setScanOpen} // Managed internally by ConnectionCard
                  // onQrScanResult={onQrScanResult} // Managed internally by ConnectionCard
                  // currentConnectionIdInput={connectionStoreState.id} // Pass if ConnectionCard needs to prefill from Redux
                  // onChangeConnectionInput={(id) => dispatch(connectionAction.changeConnectionInput(id))} // Pass if input is controlled by Redux via App
                />
                <ConnectionsListCard onDisconnectPeer={handleDisconnectPeer} />
              </>
            )}
          </Col>

          {peerStoreState.started && connectionStoreState.list.length > 0 && (
            <Col xs={24} sm={24} md={8}>
              <SendFileCard
                // Props for SendFileCard
                fileList={fileList}
                setFileList={setFileList}
                onUpload={handleUpload} // Renamed prop for clarity
                sendLoading={sendLoading}
                sendProgress={sendProgress} // Pass progress state
                // sendInfo={sendInfo ? `Speed: ${formatSpeed(sendInfo.speed)}, Remaining: ${sendInfo.remaining.toFixed(1)}s` : null} // Format info here or in card
                sendInfoString={sendInfo ? `Sent: ${(sendInfo.sent / (1024*1024)).toFixed(2)}MB / ${(sendInfo.total / (1024*1024)).toFixed(2)}MB | Speed: ${sendInfo.speed > 0 ? sendInfo.speed + ' MB/s' : 'Calculating...'} | ETA: ${sendInfo.remaining > 0 ? sendInfo.remaining.toFixed(1) + 's' : '-'}` : null}
                // connections={connectionStoreState.list} // Handled by SendFileCard's useSelector
                // selectedConnectionId={connectionStoreState.selectedId} // Pass if used for targeting send
                // onSelectConnectionTarget={(id) => dispatch(connectionAction.selectItem(id))} // Or manage target selection locally in SendFileCard
                // For this refactor, assuming SendFileCard might have its own target selection if needed,
                // or App.tsx passes down the currently selected connection ID from connectionStoreState.selectedId
                // For simplicity, handleUpload now takes the targetID.
                // SendFileCard will need a way to select this targetID from available connections.
                // This was not explicitly in the original SendFileCard. Adding a simple selector.
                 activeConnections={connectionStoreState.list}
                 selectedTargetId={selectedTargetId}
                 setSelectedTargetId={setSelectedTargetId}
                 disabled={sendLoading || connectionStoreState.list.length === 0}
              />
              <ReceivedFilesCard
                // Props for ReceivedFilesCard
                // receivedFiles={connectionStoreState.receivedFiles} // Handled by ReceivedFilesCard's useSelector
                // onDownloadFile={handleDownload} // This logic is now encapsulated in ReceivedFilesCard
                // downloadedRef is for App.tsx's useEffect, not directly for the card.
              />
            </Col>
          )}

          {/* LogViewer could be a third column or below, depending on layout preference */}
          {/* For now, keeping a similar 3-column structure if all cards are active */}
           {peerStoreState.started && (
            <Col xs={24} sm={24} md={8}>
              {/* Placeholder for LogViewer if it's a separate component */}
              {/* <LogViewer /> */}
            </Col>
           )}

        </Row>
      </Content>
      <MainFooter />
    </Layout>
  );
};

export default App;
