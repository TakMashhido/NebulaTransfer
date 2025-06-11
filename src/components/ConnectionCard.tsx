import React, { useState } from 'react';
import { Card, Input, Button, Tooltip, Modal, Alert, message, Typography } from 'antd'; // Added message, Typography
import { ScanOutlined, LinkOutlined } from '@ant-design/icons';
import QrScanner from 'react-qr-scanner'; // Using react-qr-scanner
import { useDispatch } from 'react-redux'; // Kept for local logging
import { addLog } from '../store/logSlice'; // Kept for local logging
// Removed Peer, DataConnection, addConnection, removeConnection, addReceivedFile

const { Text } = Typography; // For modal text if needed, though not strictly used now.

interface ConnectionCardProps {
  // peerInstance: Peer | null; // Not needed as onConnect handles it
  disabled: boolean; // e.g. if peer session is not started
  onConnect: (targetPeerId: string) => void; // Callback to App.tsx to handle connection logic
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ disabled, onConnect }) => {
  const dispatch = useDispatch();
  const [targetPeerId, setTargetPeerId] = useState('');
  const [scanQr, setScanQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const handleConnect = () => {
    if (targetPeerId.trim()) {
      onConnect(targetPeerId.trim());
      setTargetPeerId(''); // Clear input after attempting connect
    } else {
      message.warning('Target Peer ID cannot be empty.'); // Use Ant Design message
      dispatch(addLog('Attempted to connect with empty Peer ID.'));
    }
  };

  // Adjusted for react-qr-scanner's onScan prop which usually returns an object with a 'text' property or just the text.
  // The original App.tsx used data.text.
  const handleQrScan = (data: { text: string } | string | null) => {
    if (data) {
      const scannedId = typeof data === 'string' ? data : data.text;
      if (scannedId) {
        setScanQr(false);
        // setTargetPeerId(scannedId); // Optionally update input field
        dispatch(addLog(`QR code scanned: ${scannedId}`));
        onConnect(scannedId); // Automatically connect after scan
      } else {
        setQrError('Invalid QR code data.');
        dispatch(addLog('QR scan resulted in invalid data.'));
      }
    }
  };

  const handleQrError = (err: any) => {
    console.error('QR Scanner Error:', err);
    setQrError('Could not access camera or error scanning. Please ensure permissions are granted.');
    dispatch(addLog(`QR Scanner Error: ${err.message || err}`));
    setScanQr(false); // Close scanner on error
  };

  const openScanner = () => {
    setScanQr(true);
    setQrError(null);
  };

  return (
    <Card title="Connect to Peer" style={{ marginBottom: 20 }}>
      <Input.Group compact style={{ width: '100%' }}>
        <Input
          style={{ width: 'calc(100% - 80px)' }} // Width for Input and two buttons
          placeholder="Enter Target Peer ID"
          value={targetPeerId}
          onChange={(e) => setTargetPeerId(e.target.value)}
          onPressEnter={handleConnect}
          disabled={disabled}
        />
        <Tooltip title="Scan QR Code">
          <Button icon={<ScanOutlined />} onClick={openScanner} disabled={disabled} />
        </Tooltip>
        <Button
            type="primary"
            icon={<LinkOutlined />}
            onClick={handleConnect}
            disabled={disabled || !targetPeerId.trim()} // Disable if input is empty
        >
          Connect
        </Button>
      </Input.Group>

      <Modal
        title="Scan Target Peer QR Code"
        open={scanQr}
        onCancel={() => setScanQr(false)}
        footer={null}
        destroyOnClose // Ensure camera is released
      >
        {scanQr && ( // Conditionally render QrScanner to re-initialize on open, helps with camera
          <QrScanner
            delay={300}
            onError={handleQrError}
            onScan={handleQrScan}
            style={{ width: '100%' }}
            constraints={{ video: { facingMode: "environment" } }} // Prefer back camera
          />
        )}
        {qrError && <Alert message="QR Scan Error" description={qrError} type="error" showIcon style={{ marginTop: 10 }} />}
      </Modal>
    </Card>
  );
};

export default ConnectionCard;
