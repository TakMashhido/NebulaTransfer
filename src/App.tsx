import React, {useState} from 'react';
import {Button, Card, Col, Input, Menu, MenuProps, message, Row, Space, Typography, Upload, UploadFile, Layout, List} from "antd";
import {CopyOutlined, UploadOutlined, DownloadOutlined} from "@ant-design/icons";
import ThemeToggle from './theme/ThemeToggle';
import {useAppDispatch, useAppSelector} from "./store/hooks";
import {startPeer, stopPeerSession, setSecret} from "./store/peer/peerActions";
import * as connectionAction from "./store/connection/connectionActions"
import {DataType, PeerConnection} from "./helpers/peer";
import {deriveKey} from "./helpers/encryption";
import {assembleFile} from "./helpers/fileCache";
import {useAsyncState} from "./helpers/hooks";
import download from "js-file-download";
import {ReceivedFile} from "./store/connection/connectionTypes";
import QRCode from 'qrcode.react';
import QrScanner from 'react-qr-scanner';

const {Title} = Typography
type MenuItem = Required<MenuProps>['items'][number]

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: MenuItem[],
    type?: 'group',
): MenuItem {
    return {
        key,
        icon,
        children,
        label,
        type,
    } as MenuItem;
}

export const App: React.FC = () => {

    const peer = useAppSelector((state) => state.peer)
    const connection = useAppSelector((state) => state.connection)
    const receivedFiles = connection.receivedFiles
    const dispatch = useAppDispatch()
    const [secretInput, setSecretInput] = useState('')
    const [scanOpen, setScanOpen] = useState(false)

    const handleStartSession = () => {
        dispatch(setSecret(secretInput))
        dispatch(startPeer())
    }

    const handleStopSession = async () => {
        await PeerConnection.closePeerSession()
        dispatch(stopPeerSession())
    }

    const handleConnectOtherPeer = () => {
        connection.id != null ? dispatch(connectionAction.connectPeer(connection.id || "")) : message.warning("Please enter ID")
    }

    const [fileList, setFileList] = useAsyncState([] as UploadFile[])
    const [sendLoading, setSendLoading] = useAsyncState(false)

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.warning("Please select file")
            return
        }
        if (!connection.selectedId) {
            message.warning("Please select a connection")
            return
        }
        try {
            await setSendLoading(true);
            let file = fileList[0] as unknown as File;
            const key = await deriveKey(peer.secret)
            await PeerConnection.sendLargeFile(connection.selectedId, file, key)
            await setSendLoading(false)
            message.info("Send file successfully")
        } catch (err) {
            await setSendLoading(false)
            console.log(err)
            message.error("Error when sending file")
        }
    }

    const handleDownload = async (file: ReceivedFile) => {
        const blob = await assembleFile(file.id, file.chunks, file.fileType)
        download(blob, file.fileName, file.fileType)
    }

    return (
        <Layout style={{minHeight: '100vh'}}>
            <Layout.Header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Title level={3} style={{color: '#fff', margin: 0}}>NebulaTransfer</Title>
                <ThemeToggle/>
            </Layout.Header>
            <Layout.Content style={{padding: 24}}>
                <Row justify={"center"} align={"top"}>
                    <Col xs={24} sm={24} md={20} lg={16} xl={12}>
                        <Card>
                            <Title level={2} style={{textAlign: "center"}}>NebulaTransfer</Title>
                        <Card hidden={peer.started}>
                            <Space direction="vertical">
                                <Input.Password placeholder={"Secret"} value={secretInput} onChange={e => setSecretInput(e.target.value)} />
                                <Button onClick={handleStartSession} loading={peer.loading}>Start</Button>
                            </Space>
                        </Card>
                        <Card hidden={!peer.started}>
                            <Space direction="vertical">
                                <Space direction="horizontal">
                                    <div>ID: {peer.id}</div>
                                    <Button icon={<CopyOutlined/>} onClick={async () => {
                                        await navigator.clipboard.writeText(peer.id || "")
                                        message.info("Copied: " + peer.id)
                                    }}/>
                                    <Button danger onClick={handleStopSession}>Stop</Button>
                                </Space>
                                <QRCode value={peer.id || ''} size={128} />
                            </Space>
                        </Card>
                        <div hidden={!peer.started}>
                            <Card>
                                <Space direction="horizontal">
                                    <Input placeholder={"ID"}
                                           onChange={e => dispatch(connectionAction.changeConnectionInput(e.target.value))}
                                           required={true}
                                           />
                                    <Button onClick={handleConnectOtherPeer}
                                            loading={connection.loading}>Connect</Button>
                                    <Button onClick={() => setScanOpen(true)}>Scan</Button>
                                </Space>
                                {scanOpen && (
                                    <div style={{marginTop: 16}}>
                                        <QrScanner
                                            delay={300}
                                            onError={() => setScanOpen(false)}
                                            onScan={(data: any) => {
                                                if (data) {
                                                    dispatch(connectionAction.changeConnectionInput(data.text))
                                                    setScanOpen(false)
                                                    handleConnectOtherPeer()
                                                }
                                            }}
                                            style={{width: '100%'}}
                                        />
                                    </div>
                                )}
                            </Card>

                            <Card title="Connection">
                                {
                                    connection.list.length === 0
                                        ? <div>Waiting for connection ...</div>
                                        : <div>
                                            Select a connection
                                            <Menu selectedKeys={connection.selectedId ? [connection.selectedId] : []}
                                                  onSelect={(item) => dispatch(connectionAction.selectItem(item.key))}
                                                  items={connection.list.map(e => getItem(e, e, null))}/>
                                        </div>
                                }

                            </Card>
                            <Card title="Send File">
                                <Upload fileList={fileList}
                                        maxCount={1}
                                        onRemove={() => setFileList([])}
                                        beforeUpload={(file) => {
                                            setFileList([file])
                                            return false
                                        }}>
                                    <Button icon={<UploadOutlined/>}>Select File</Button>
                                </Upload>
                                <Button
                                    type="primary"
                                    onClick={handleUpload}
                                    disabled={fileList.length === 0}
                                    loading={sendLoading}
                                    style={{marginTop: 16}}
                                >
                                {sendLoading ? 'Sending' : 'Send'}
                                </Button>
                            </Card>
                            <Card title="Received Files" style={{marginTop: 16}}>
                                {
                                    receivedFiles.length === 0
                                        ? <div>No file received</div>
                                        : <List
                                            dataSource={receivedFiles}
                                            renderItem={(item: ReceivedFile) => (
                                                <List.Item
                                                    actions={[<Button icon={<DownloadOutlined/>}
                                                                     disabled={!item.ready}
                                                                     onClick={() => handleDownload(item)}>Download</Button>]}
                                                >
                                                    <List.Item.Meta
                                                        title={item.fileName}
                                                        description={`from ${item.from}`}
                                                    />
                                                    {!item.ready && <div style={{width: '100%'}}>
                                                        <progress max={item.chunks} value={item.received} style={{width:'100%'}}></progress>
                                                    </div>}
                                                </List.Item>
                                            )}
                                        />
                                }
                            </Card>
                        </div>
                    </Card>
                </Col>
            </Row>
            </Layout.Content>
            <Layout.Footer style={{textAlign: 'center'}}>Developed by Koustav Kumar Mondal</Layout.Footer>
        </Layout>
    )
}

export default App
