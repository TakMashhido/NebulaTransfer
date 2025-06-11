import React from 'react';
import { Card, List, Button, Typography, Empty, Tag, Tooltip, Progress, message, Space } from 'antd'; // Added Space
import { FileDoneOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store'; // Corrected path
import { useAppSelector } from '../store/hooks'; // Corrected path
import { ReceivedFile } from '../store/connection/connectionTypes';
import { clearReceivedFiles } from '../store/connection/connectionActions';
import { saveAs } from 'file-saver';
import { addLog } from '../store/logSlice';
import { formatBytes, formatSpeed, formatDuration } from '../helpers/format'; // Import format helpers

const { Text, Paragraph } = Typography;

const ReceivedFilesCard: React.FC = () => {
  const dispatch = useDispatch();
  const receivedFiles = useSelector((state: RootState) => state.connection.receivedFiles); // Corrected selector path
  const currentTheme = useAppSelector((state) => state.theme.currentTheme);


  const handleDownload = (file: ReceivedFile) => {
    if (file.blob) {
      saveAs(file.blob, file.name);
      dispatch(addLog(`Downloaded file: ${file.name}`));
    } else {
      message.error(`File data for "${file.name}" is not fully available or corrupted.`);
      dispatch(addLog(`Error: No complete blob data for file: ${file.name}`));
    }
  };

  const handlePreview = (file: ReceivedFile) => {
    if (file.blob && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      try {
        const url = URL.createObjectURL(file.blob);
        window.open(url, '_blank');
        // It's better to revoke the object URL when it's no longer needed,
        // for example, when the new tab/window is closed, but that's hard to track.
        // Revoking too soon can prevent the content from loading in the new tab.
        // A common practice is to revoke it after a delay.
        setTimeout(() => URL.revokeObjectURL(url), 1000 * 60); // Revoke after 1 minute
      } catch (error) {
        console.error("Error creating object URL for preview:", error);
        message.error(`Could not generate preview for ${file.name}.`);
        dispatch(addLog(`Error creating object URL for preview of ${file.name}: ${error}`));
      }
    } else {
      message.info(`Preview not available for file type: ${file.type || 'unknown'}`);
      dispatch(addLog(`Preview not available for file type: ${file.type || 'unknown'} for file ${file.name}`));
    }
  };

  const handleClearAll = () => {
    dispatch(clearReceivedFiles());
    dispatch(addLog('Cleared all received files.'));
  };

  if (receivedFiles.length === 0) {
    return (
      <Card title="Received Files" style={{ marginBottom: 20 }}>
        <Empty description="No files received yet." />
      </Card>
    );
  }

  return (
    <Card
      title="Received Files"
      style={{ marginBottom: 20 }}
      extra={
        <Button
          onClick={handleClearAll}
          danger
          size="small"
          icon={<DeleteOutlined />}
          disabled={receivedFiles.length === 0} // This button won't be visible if length is 0 due to above check, but good practice
        >
          Clear All
        </Button>
      }
    >
      <List
        itemLayout="horizontal"
        dataSource={receivedFiles}
        renderItem={(file) => (
          <List.Item
            key={file.id} // Added key for list items
            actions={[
              <Tooltip title="Download File">
                <Button icon={<DownloadOutlined />} onClick={() => handleDownload(file)} type="text" disabled={!file.ready && file.progress !== 100} />
              </Tooltip>,
              <Tooltip title="Preview File (if supported)">
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(file)}
                  type="text"
                  disabled={!file.ready || (!file.type.startsWith('image/') && file.type !== 'application/pdf')}
                />
              </Tooltip>
            ]}
          >
            <List.Item.Meta
              avatar={<FileDoneOutlined style={{ fontSize: '24px', color: file.ready ? '#52c41a' : '#1890ff' }} />}
              title={
                <Tooltip title={file.name}>
                  <Text style={{color: currentTheme === 'dark' ? 'white' : 'black'}} ellipsis={{ tooltip: false }}>
                    {file.name}
                  </Text>
                </Tooltip>
              }
              description={
                <Space direction="vertical" size="small" style={{width: '100%'}}>
                  <Text type="secondary" style={{fontSize: '12px'}}>
                    From: {file.from}
                  </Text>
                  {file.ready && file.averageSpeed !== undefined && file.totalTime !== undefined ? (
                    <Text style={{fontSize: '12px', color: currentTheme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)'}}>
                      Size: {formatBytes(file.size)} | Avg Speed: {formatSpeed(file.averageSpeed)} | Time: {formatDuration(file.totalTime)}
                    </Text>
                  ) : (
                    <Paragraph style={{fontSize: '12px', margin: 0, color: currentTheme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)'}}>
                      Size: {formatBytes(file.size)}
                    </Paragraph>
                  )}
                  <div>
                    {file.type && <Tag style={{ marginRight: !file.ready && file.progress < 100 ? 8 : 0 }}>{file.type}</Tag>}
                    {!file.ready && file.progress < 100 && (
                      <Progress percent={file.progress} size="small" style={{width: file.type ? 'calc(100% - 60px)' : '100%', display:'inline-block'}} />
                    )}
                  </div>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default ReceivedFilesCard;
