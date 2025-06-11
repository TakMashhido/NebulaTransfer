import React from 'react';
import { Card, Button, Typography, Spin, Alert, Space, message } from 'antd'; // Added Space and message
import { PlayCircleOutlined, StopOutlined, LoadingOutlined, CopyOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store'; // Corrected path
import { useAppSelector } from '../store/hooks'; // Corrected path
import { QRCodeSVG } from 'qrcode.react';

const { Text, Paragraph } = Typography;

interface SessionInfoCardProps {
  onStartSession: () => void;
  onStopSession: () => void;
  isSessionStarted: boolean;
}

const SessionInfoCard: React.FC<SessionInfoCardProps> = ({
  onStartSession,
  onStopSession,
  isSessionStarted,
}) => {
  const peerId = useSelector((state: RootState) => state.peer.id);
  const isLoading = useSelector((state: RootState) => state.peer.loading);
  const peerError = undefined;
  const currentTheme = useAppSelector((state) => state.theme.currentTheme);


  const handleCopyId = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId)
        .then(() => message.success('Peer ID copied to clipboard!'))
        .catch(err => message.error('Failed to copy Peer ID.'));
    }
  };

  return (
    <Card title="My Session" style={{ marginBottom: 20 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%', alignItems: 'center' }}>
        {!isSessionStarted && !isLoading && (
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={onStartSession} block>
            Start Session
          </Button>
        )}
        {isLoading && (
          <Space direction="vertical" align="center">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} />
            <Paragraph>Starting session...</Paragraph>
          </Space>
        )}
        {peerError && !isLoading && !isSessionStarted && (
          <Alert message="Error Starting Session" description={peerError} type="error" showIcon style={{width: '100%'}}/>
        )}
        {isSessionStarted && peerId && !isLoading && (
          <>
            <Space direction="horizontal" align="center">
              <Text strong style={{ fontSize: '16px' }}>Your Peer ID:</Text>
              <Text code strong copyable={{ tooltips: ['Copy ID', 'ID Copied!'], onCopy: handleCopyId }}>
                {peerId}
              </Text>
              {/* The antd copyable Text component provides its own button, so explicit one removed for cleaner UI */}
            </Space>

            <Paragraph style={{ marginTop: 8, textAlign:'center', color: currentTheme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)' }}>
                Share this ID or scan the QR Code:
            </Paragraph>
            <QRCodeSVG
                value={peerId}
                size={160} // Slightly larger for better scannability
                bgColor={currentTheme === 'dark' ? '#1f1f1f' : '#FFFFFF'} // Adjusted dark bg for QR
                fgColor={currentTheme === 'dark' ? '#FFFFFF' : '#000000'}
                level="M" // Error correction level
                style={{background: currentTheme === 'dark' ? '#1f1f1f' : '#FFFFFF', padding: '8px', borderRadius: '8px' }}
            />
            <Button type="dashed" danger icon={<StopOutlined />} onClick={onStopSession} block>
              Stop Session & Disconnect All
            </Button>
          </>
        )}
      </Space>
    </Card>
  );
};

export default SessionInfoCard;
