import React from 'react';
import { Card, List, Button, Typography, Empty, Tag, Tooltip, Progress, message, Space } from 'antd';
import { FileDoneOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { useAppSelector } from '../store/hooks';
import { ReceivedFile } from '../store/connection/connectionTypes';
import { clearReceivedFiles } from '../store/connection/connectionActions';
import fileDownload from 'js-file-download';
import { assembleFile } from '../helpers/fileCache';
import { addLog } from '../store/logSlice';
import { formatBytes, formatSpeed, formatDuration } from '../helpers/format';

const { Text, Paragraph } = Typography;

const ReceivedFilesCard: React.FC = () => {
  const dispatch = useDispatch();
  const receivedFiles = useSelector((state: RootState) => state.connection.receivedFiles); // Corrected selector path
  const currentTheme = useAppSelector((state) => state.theme.currentTheme);


  const handleDownload = async (file: ReceivedFile) => {
    try {
      const blob = await assembleFile(file.id, file.chunks, file.fileType);
      fileDownload(blob, file.fileName);
      dispatch(addLog(`Downloaded file: ${file.fileName}`));
    } catch (err) {
      console.error('Download error', err);
      message.error(`File data for "${file.fileName}" is not fully available or corrupted.`);
      dispatch(addLog(`Error downloading file: ${file.fileName}`));
    }
  };

  const handlePreview = async (file: ReceivedFile) => {
    if (file.fileType.startsWith('image/') || file.fileType === 'application/pdf') {
      try {
        const blob = await assembleFile(file.id, file.chunks, file.fileType);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // It's better to revoke the object URL when it's no longer needed,
        // for example, when the new tab/window is closed, but that's hard to track.
        // Revoking too soon can prevent the content from loading in the new tab.
        // A common practice is to revoke it after a delay.
        setTimeout(() => URL.revokeObjectURL(url), 1000 * 60); // Revoke after 1 minute
      } catch (error) {
        console.error("Error creating object URL for preview:", error);
        message.error(`Could not generate preview for ${file.fileName}.`);
        dispatch(addLog(`Error creating object URL for preview of ${file.fileName}: ${error}`));
      }
    } else {
      message.info(`Preview not available for file type: ${file.fileType || 'unknown'}`);
      dispatch(addLog(`Preview not available for file type: ${file.fileType || 'unknown'} for file ${file.fileName}`));
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
                <Button icon={<DownloadOutlined />} onClick={() => handleDownload(file)} type="text" disabled={!file.ready && file.received < file.chunks} />
              </Tooltip>,
              <Tooltip title="Preview File (if supported)">
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(file)}
                  type="text"
                  disabled={!file.ready || (!file.fileType.startsWith('image/') && file.fileType !== 'application/pdf')}
                />
              </Tooltip>
            ]}
          >
            <List.Item.Meta
              avatar={<FileDoneOutlined style={{ fontSize: '24px', color: file.ready ? '#52c41a' : '#1890ff' }} />}
              title={
                <Tooltip title={file.fileName}>
                  <Text style={{color: currentTheme === 'dark' ? 'white' : 'black'}} ellipsis={{ tooltip: false }}>
                    {file.fileName}
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
                    {file.fileType && <Tag style={{ marginRight: !file.ready && file.received < file.chunks ? 8 : 0 }}>{file.fileType}</Tag>}
                    {!file.ready && file.received < file.chunks && (
                      <Progress
                        percent={(file.received / file.chunks) * 100}
                        size="small"
                        format={() => {
                          const elapsed = file.startTime ? (Date.now() - file.startTime) / 1000 : 0;
                          const receivedBytes = (file.size / file.chunks) * file.received;
                          const speed = elapsed > 0 ? receivedBytes / elapsed : 0;
                          return `${formatSpeed(speed)}`;
                        }}
                        style={{width: file.fileType ? 'calc(100% - 60px)' : '100%', display:'inline-block'}}
                      />
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
