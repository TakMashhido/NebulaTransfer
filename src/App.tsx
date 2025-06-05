import React, {useState, useEffect, useRef} from 'react';
import {Button, Card, Col, Input, Menu, MenuProps, message, Row, Space, Typography, Upload, UploadFile, Layout, List} from "antd";
import {CopyOutlined, UploadOutlined} from "@ant-design/icons";
import ThemeToggle from './theme/ThemeToggle';
import {useAppDispatch, useAppSelector} from "./store/hooks";
import {startPeer, stopPeerSession} from "./store/peer/peerActions";
import * as connectionAction from "./store/connection/connectionActions"
import {PeerConnection} from "./helpers/peer";
import {assembleFile} from "./helpers/fileCache";
import {useAsyncState} from "./helpers/hooks";
import download from "js-file-download";
import {ReceivedFile} from "./store/connection/connectionTypes";
import {formatSpeed} from "./helpers/format";
import { QRCodeSVG } from 'qrcode.react';
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
    const [scanOpen, setScanOpen] = useState(false)

    const handleStartSession = () => {
        dispatch(startPeer())
    }

    const handleStopSession = async () => {
        await PeerConnection.closePeerSession()
        dispatch(stopPeerSession())
    }

    const handleConnectOtherPeer = (targetId?: string) => {
        const id = targetId ?? connection.id
        id ? dispatch(connectionAction.connectPeer(id)) : message.warning("Please enter ID")
    }

    const [fileList, setFileList] = useAsyncState([] as UploadFile[])
    const [sendLoading, setSendLoading] = useAsyncState(false)
    const [sendInfo, setSendInfo] = useState<{sent:number,total:number,speed:number,remaining:number} | null>(null)
    const downloadedRef = useRef<Set<string>>(new Set())

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
            await PeerConnection.sendFileWithPin(connection.selectedId, file, (sent, total, speed, remaining) => {
                setSendInfo({sent, total, speed, remaining})
            })
            await setSendLoading(false)
            message.info("Send file successfully")
        } catch (err: any) {
            await setSendLoading(false)
            console.log(err)
            message.error(err?.message || "Error when sending file")
        }
    }

    const handleDownload = async (file: ReceivedFile) => {
        const blob = await assembleFile(file.id, file.chunks, file.fileType)
        download(blob, file.fileName, file.fileType)
    }

    useEffect(() => {
        receivedFiles.forEach(f => {
            if (f.ready && !downloadedRef.current.has(f.id)) {
                downloadedRef.current.add(f.id)
                handleDownload(f)
            }
        })
    }, [receivedFiles])

    return (
        <Layout style={{minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'}}>
            <Layout.Header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Title level={3} style={{color: '#fff', margin: 0}}>NebulaTransfer</Title>
                <ThemeToggle/>
            </Layout.Header>
            <Layout.Content style={{padding: 24}}>
                <Row justify={"center"} align={"top"}>
                    <Col xs={24} sm={24} md={20} lg={16} xl={12}>
                        <Card style={{borderRadius:16, background:'rgba(255,255,255,0.1)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.2)'}}>
                            <Title level={2} style={{textAlign: "center"}}>NebulaTransfer</Title>
                        <Card hidden={peer.started} style={{marginTop:16, borderRadius:12}}>
                            <Space direction="vertical">
                                <Button onClick={handleStartSession} loading={peer.loading}>Start</Button>
                            </Space>
                        </Card>
                        <Card hidden={!peer.started} style={{marginTop:16, borderRadius:12}}>
                            <Space direction="vertical">
                                <Space direction="horizontal">
                                    <div>ID: {peer.id}</div>
                                    <Button icon={<CopyOutlined/>} onClick={async () => {
                                        await navigator.clipboard.writeText(peer.id || "")
                                        message.info("Copied: " + peer.id)
                                    }}/>
                                    <Button danger onClick={handleStopSession}>Stop</Button>
                                </Space>
                                <QRCodeSVG value={peer.id || ''} size={128} />
                            </Space>
                        </Card>
                        <div hidden={!peer.started}>
                            <Card style={{marginTop:16, borderRadius:12}}>
                                <Space direction="horizontal">
                                    <Input placeholder={"ID"}
                                           onChange={e => dispatch(connectionAction.changeConnectionInput(e.target.value))}
                                           required={true}
                                           />
                                    <Button onClick={() => handleConnectOtherPeer()}
                                            loading={connection.loading}>Connect</Button>
                                    <Button onClick={() => setScanOpen(true)}>Scan</Button>
                                </Space>
                                {scanOpen && (
                                    <div style={{marginTop: 16}}>
                                        <QrScanner
                                            delay={300}
                                            facingMode="front"
                                            onError={() => setScanOpen(false)}
                                            onScan={(data: any) => {
                                                if (data) {
                                                    const scanned = data.text
                                                    dispatch(connectionAction.changeConnectionInput(scanned))
                                                    setScanOpen(false)
                                                    handleConnectOtherPeer(scanned)
                                                }
                                            }}
                                            style={{width: '100%'}}
                                        />
                                    </div>
                                )}
                            </Card>

                            <Card title="Connection" style={{marginTop:16, borderRadius:12}}>
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
                            <Card title="Send File" style={{marginTop:16, borderRadius:12}}>
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
                                {sendInfo &&
                                    <div style={{marginTop: 8}}>
                                        <progress max={sendInfo.total} value={sendInfo.sent} style={{width:'100%'}}></progress>
                                        <div style={{fontSize:12,marginTop:4}}>Speed: {formatSpeed(sendInfo.speed)}, Remaining: {sendInfo.remaining.toFixed(1)}s</div>
                                    </div>
                                }
                            </Card>
                            <Card title="Received Files" style={{marginTop:16, borderRadius:12}}>
                                {
                                    receivedFiles.length === 0
                                        ? <div>No file received</div>
                                        : <List
                                            dataSource={receivedFiles}
                                            renderItem={(item: ReceivedFile) => (
                                                <List.Item>
                                                    <List.Item.Meta
                                                        title={item.fileName}
                                                        description={`from ${item.from}`}
                                                    />
                                                    {!item.ready && <div style={{width: '100%'}}>
                                                        <progress max={item.chunks} value={item.received} style={{width:'100%'}}></progress>
                                                        {item.startTime && <div style={{fontSize:12,marginTop:4}}>
                                                            {(() => {
                                                                const progressBytes = (item.received / item.chunks) * item.size;
                                                                const elapsed = (Date.now() - item.startTime!) / 1000;
                                                                const speed = progressBytes / (elapsed || 1);
                                                                const remaining = (item.size - progressBytes) / (speed || 1);
                                                                return `Speed: ${formatSpeed(speed)}, Remaining: ${remaining.toFixed(1)}s`;
                                                            })()}
                                                        </div>}
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
