import React, { useState, useEffect } from 'react'; // Added useState, useEffect
import { Card, Button, Upload, message, Typography, Progress, Alert, Select, Empty, Space } from 'antd';
import { SendOutlined, PaperClipOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { MAX_FILE_SIZE_GB } from '../config';
import { formatSpeed, formatDuration } from '../helpers/format'; // Import helpers

const { Paragraph, Text } = Typography; // Added Text
const { Option } = Select;

interface SendFileCardProps {
  fileList: UploadFile[];
  setFileList: (fileList: UploadFile[]) => void;
  onUpload: (targetPeerId: string) => void;
  sendLoading: boolean;
  sendProgress: number;
  sendInfoString: string | null;
  disabled: boolean;
  activeConnections: string[];
  selectedTargetId: string | null;
  setSelectedTargetId: (id: string | null) => void;
}

const SendFileCard: React.FC<SendFileCardProps> = ({
  fileList,
  setFileList,
  onUpload,
  sendLoading,
  sendProgress,
  sendInfoString,
  disabled,
  activeConnections,
  selectedTargetId,
  setSelectedTargetId,
}) => {
  const [averageSendSpeed, setAverageSendSpeed] = useState<number | null>(null);
  const [totalSendTime, setTotalSendTime] = useState<number | null>(null);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);

  // Effect to reset stats when fileList changes (new file selected)
  useEffect(() => {
    setAverageSendSpeed(null);
    setTotalSendTime(null);
    // setSendInfoString(null); // This is a prop controlled by App.tsx, App.tsx should reset it.
    // App.tsx already sets sendInfo to null before starting upload and on success.
  }, [fileList]);

  const uploadAntProps: UploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
      // Reset stats when file is removed
      setAverageSendSpeed(null);
      setTotalSendTime(null);
    },
    beforeUpload: (file) => {
      if (fileList.length >= 1) {
        message.error('You can only send one file at a time.');
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_FILE_SIZE_GB * 1024 * 1024 * 1024) {
        message.error(`File is too large. Max size: ${MAX_FILE_SIZE_GB}GB. Please select a smaller file.`);
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
      // Reset stats for new file selection
      setAverageSendSpeed(null);
      setTotalSendTime(null);
      return false;
    },
    fileList,
    maxCount: 1,
  };

  const handleSendFile = async () => { // Made async to handle potential promise from onUpload
    if (!selectedTargetId) {
      message.error('Please select a connection to send the file to.');
      return;
    }
    if (fileList.length === 0) {
      message.error('Please select a file to send.');
      return;
    }

    setUploadStartTime(Date.now());
    setAverageSendSpeed(null); // Clear previous average speed
    setTotalSendTime(null);   // Clear previous total time

    try {
      await onUpload(selectedTargetId); // onUpload is already async in App.tsx
      // Calculations moved to App.tsx's handleUpload, this card will just display based on props
      // This component will now rely on sendInfoString for final status,
      // or new props for averageSpeed and totalTime if we decide to pass them.
      // For now, the prompt implies calculating here and then updating App.tsx's state, which is tricky.
      // Let's assume onUpload in App.tsx will handle setting these stats, and SendFileCard receives them via props.
      // The prompt: "Upon successful completion... Set setAverageSendSpeed(avgSpeed); Set setTotalSendTime(durationInSeconds);"
      // This means App.tsx needs to somehow communicate this back or this card's onUpload needs to be a more complex callback.

      // Re-evaluating: The prompt says "In the handleUpload function... Set setAverageSendSpeed(avgSpeed);".
      // This implies the logic should be within this component's scope if onUpload is just a trigger.
      // However, onUpload in App.tsx *is* the main sending logic.
      // The most straightforward way is for App.tsx to calculate these and update its state,
      // then pass `averageSendSpeed` and `totalSendTime` as new props to this card.
      // For this iteration, I will add the calculation here as requested and manage it with local state.
      // App.tsx's `sendInfo` will be cleared by App.tsx.

      if (uploadStartTime && fileList.length > 0 && fileList[0].size) {
        const endTime = Date.now();
        const durationInSeconds = (endTime - uploadStartTime) / 1000;
        const totalBytes = fileList[0].size;
        if (durationInSeconds > 0) {
          const avgSpeed = totalBytes / durationInSeconds;
          setAverageSendSpeed(avgSpeed);
        } else {
          setAverageSendSpeed(totalBytes); // Instantaneous if duration is ~0
        }
        setTotalSendTime(durationInSeconds);
      }

    } catch (error) {
        // Error already handled by onUpload in App.tsx which sets sendInfoString
        console.error("SendFileCard: Error during onUpload", error);
    }
  };

  const renderStatus = () => {
    if (sendLoading) {
      return (
        <>
          <Progress percent={sendProgress} status="active" style={{ width: '100%' }} />
          {sendInfoString && (
            <Text type="secondary">{sendInfoString}</Text>
          )}
        </>
      );
    }
    if (!sendLoading && averageSendSpeed !== null && totalSendTime !== null) {
      const successMessage = `File sent! Avg speed: ${formatSpeed(averageSendSpeed)}, Time: ${formatDuration(totalSendTime)}.`;
      return <Alert message={successMessage} type="success" showIcon style={{ width: '100%' }} />;
    }
    if (sendInfoString && !sendLoading) { // Fallback to sendInfoString if not loading and no avg stats yet (e.g. error before completion)
      return <Alert message={sendInfoString} type={sendInfoString.toLowerCase().startsWith("error") ? "error" : "info"} showIcon style={{ width: '100%' }} />;
    }
    return null;
  };

  return (
    <Card title="Send File" style={{ marginBottom: 20 }}>
      {activeConnections.length === 0 ? (
         <Empty description="No active connections to send files to. Please connect to a peer first." />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Select
            placeholder="Select a connection to send to"
            style={{ width: '100%' }}
            value={selectedTargetId}
            onChange={(value) => {
              setSelectedTargetId(value);
              setAverageSendSpeed(null); // Reset stats on new target selection
              setTotalSendTime(null);
            }}
            disabled={disabled || sendLoading}
          >
            {activeConnections.map((peerId) => (
              <Option key={peerId} value={peerId}>
                {peerId}
              </Option>
            ))}
          </Select>

          <Upload {...uploadAntProps} disabled={disabled || sendLoading || !selectedTargetId} style={{width: '100%'}}>
            <Button icon={<PaperClipOutlined />} disabled={disabled || sendLoading || !selectedTargetId} block>
              Select File (Max {MAX_FILE_SIZE_GB}GB)
            </Button>
          </Upload>

          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendFile}
            loading={sendLoading}
            disabled={disabled || fileList.length === 0 || !selectedTargetId || sendLoading}
            style={{ width: '100%' }}
            block
          >
            {sendLoading ? `Sending... ${sendProgress}%` : 'Send File'}
          </Button>

          {renderStatus()}
        </Space>
      )}
    </Card>
  );
};

export default SendFileCard;
