import {PeerActionType} from "./peerTypes";
import {Dispatch} from "redux";
import {DataType, PeerConnection} from "../../helpers/peer";
import {message} from "antd";
import {addConnectionList, removeConnectionList, addReceivedFile, updateFileProgress, markFileReady} from "../connection/connectionActions";
import {cacheChunk} from "../../helpers/fileCache";

export const startPeerSession = (id: string) => ({
    type: PeerActionType.PEER_SESSION_START, id
})

export const stopPeerSession = () => ({
    type: PeerActionType.PEER_SESSION_STOP,
})
export const setLoading = (loading: boolean) => ({
    type: PeerActionType.PEER_LOADING, loading
})


export const startPeer: () => (dispatch: Dispatch, getState: () => any) => Promise<void>
    = () => (async (dispatch, getState) => {
    dispatch(setLoading(true))
    try {
        const id = await PeerConnection.startPeerSession()
        PeerConnection.onIncomingConnection(async (conn) => {
            const peerId = conn.peer
            message.info("Incoming connection: " + peerId)
            dispatch(addConnectionList(peerId))
            PeerConnection.onConnectionDisconnected(peerId, () => {
                message.info("Connection closed: " + peerId)
                dispatch(removeConnectionList(peerId))
            })
            PeerConnection.onConnectionReceiveData(peerId, async (data) => {
                if (data.dataType === DataType.FILE_REQUEST) {
                    const meta = JSON.parse(data.message || '{}')
                    const size = meta.size || 0
                    const pin = meta.pin || ''
                    const accept = window.confirm(`${peerId} wants to send ${data.fileName} (${size} bytes)`)
                    if (!accept) {
                        PeerConnection.sendConnection(peerId, {dataType: DataType.PIN_REJECT})
                        return
                    }
                    const input = window.prompt('Enter PIN') || ''
                    if (input === pin) {
                        PeerConnection.sendConnection(peerId, {dataType: DataType.PIN_ACCEPT, message: pin})
                        const total = data.total || 0
                        const fileId = `${peerId}-${data.fileName}`
                        const received = {
                            id: fileId,
                            from: peerId,
                            fileName: data.fileName || 'fileName',
                            fileType: data.fileType || '',
                            size,
                            chunks: total,
                            received: 0,
                            ready: false,
                            startTime: Date.now()
                        }
                        dispatch(addReceivedFile(received))
                    } else {
                        message.error('Invalid PIN')
                        PeerConnection.sendConnection(peerId, {dataType: DataType.PIN_REJECT})
                    }
                } else if (data.dataType === DataType.FILE_CHUNK && data.chunk !== undefined && data.index !== undefined) {
                    const fileId = `${peerId}-${data.fileName}`
                    await cacheChunk(fileId, data.index, data.chunk)
                    dispatch(updateFileProgress(fileId, data.index + 1))
                } else if (data.dataType === DataType.FILE_COMPLETE) {
                    const fileId = `${peerId}-${data.fileName}`
                    dispatch(markFileReady(fileId))
                } else if (data.dataType === DataType.FILE && data.file) {
                    const fileId = `${peerId}-${data.fileName}`
                    const received = {
                        id: fileId,
                        from: peerId,
                        fileName: data.fileName || 'fileName',
                        fileType: data.fileType || '',
                        size: data.file.size,
                        chunks: 1,
                        received: 1,
                        ready: true,
                        startTime: Date.now()
                    }
                    dispatch(addReceivedFile(received))
                    await cacheChunk(fileId, 0, await data.file.arrayBuffer())
                }
            })
        })
        dispatch(startPeerSession(id))
        dispatch(setLoading(false))
    } catch (err) {
        console.log(err)
        dispatch(setLoading(false))
    }
})


