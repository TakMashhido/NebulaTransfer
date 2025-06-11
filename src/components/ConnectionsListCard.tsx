import React from 'react';
import { Card, List, Tag, Typography, Empty, Button, Popconfirm, Menu, Tooltip, Space // Added Tooltip, Space
} from 'antd';
import { WifiOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store'; // Corrected path
import { useAppSelector } from '../store/hooks'; // Corrected path
import { addLog } from '../store/logSlice';
import * as connectionAction from "../store/connection/connectionActions";


const { Text } = Typography;

interface ConnectionsListCardProps {
  onDisconnectPeer?: (peerId: string) => void;
}

const ConnectionsListCard: React.FC<ConnectionsListCardProps> = ({ onDisconnectPeer }) => {
  const dispatch = useDispatch();
  // connection.list contains peer IDs for the menu (order and identity)
  const connectionPeerIds = useSelector((state: RootState) => state.connection.list);

  const selectedConnectionId = useSelector((state: RootState) => state.connection.selectedId);
  const currentTheme = useAppSelector((state) => state.theme.currentTheme);
  const localPeerId = useAppSelector((state: RootState) => state.peer.id); // Renamed for clarity vs. conn.peer


  const handleDisconnect = (peerToDisconnect: string) => {
    if (onDisconnectPeer) {
      dispatch(addLog(`Requesting disconnect from peer: ${peerToDisconnect} via ConnectionsListCard.`));
      onDisconnectPeer(peerToDisconnect);
    }
  };

  const handleSelectConnection = (peerIdToSelect: string) => {
    dispatch(connectionAction.selectItem(peerIdToSelect));
  };

  if (connectionPeerIds.length === 0) {
    return (
      <Card title="Active Connections" style={{ marginBottom: 20, textAlign: 'center' }}>
        <Empty description="No active connections." />
      </Card>
    );
  }

  // Data source is just the list of peer ids
  const listDataSource = connectionPeerIds;

  return (
    <Card title="Active Connections" style={{ marginBottom: 20 }}>
      <Space direction="vertical" style={{width: '100%'}} size="middle">
        <div>
          <Text>Select a connection to interact with:</Text>
          <Menu
            theme={currentTheme === 'dark' ? 'dark' : 'light'}
            selectedKeys={selectedConnectionId ? [selectedConnectionId] : []}
            onSelect={(item) => handleSelectConnection(item.key as string)}
            style={{ borderRight: 0 }}
            items={connectionPeerIds.map(connPeerId => ({
              key: connPeerId,
              label: (
                <Tooltip title={connPeerId}>
                  <Text style={{color: currentTheme === 'dark' ? 'white' : 'black'}} ellipsis={{tooltip: false}}>
                    {connPeerId}
                  </Text>
                </Tooltip>
              ),
            }))}
          />
        </div>

        {listDataSource.length > 0 && <Text>Connection Details & Actions:</Text>}
        <List
          dataSource={listDataSource}
          renderItem={(peerId: string) => (
            <List.Item
              key={peerId}
              actions={onDisconnectPeer ? [
                <Popconfirm
                  title="Disconnect?"
                  description={`Are you sure you want to disconnect from ${peerId}?`}
                  onConfirm={() => onDisconnectPeer(peerId)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="text" danger icon={<CloseCircleOutlined />} />
                </Popconfirm>
              ] : undefined}
            >
              <List.Item.Meta
                avatar={<WifiOutlined style={{ color: '#52c41a' }} />}
                title={
                  <Tooltip title={peerId}>
                    <Text style={{color: currentTheme === 'dark' ? 'white' : 'black'}} ellipsis={{tooltip: false}}>
                      {peerId}
                    </Text>
                  </Tooltip>
                }
              />
            </List.Item>
          )}
        />
      </Space>
    </Card>
  );
};

export default ConnectionsListCard;
