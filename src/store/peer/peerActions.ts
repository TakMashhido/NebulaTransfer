import {PeerActionType} from "./peerTypes";
import {Dispatch} from "redux";
import {DataType, PeerConnection} from "../../helpers/peer";
import {message} from "antd";
import {addConnectionList, removeConnectionList, addReceivedFile, updateFileProgress, markFileReady} from "../connection/connectionActions";
import {cacheChunk} from "../../helpers/fileCache";
import {deriveKey} from "../../helpers/encryption";

export const startPeerSession = (id: string) => ({
    type: PeerActionType.PEER_SESSION_START, id
})

export const stopPeerSession = () => ({
    type: PeerActionType.PEER_SESSION_STOP,
})
export const setLoading = (loading: boolean) => ({
    type: PeerActionType.PEER_LOADING, loading
})

export const setSecret = (secret: string) => ({
    type: PeerActionType.PEER_SET_SECRET, secret
})

export const startPeer: () => (dispatch: Dispatch, getState: () => any) => Promise<void>
    = () => (async (dispatch, getState) => {
    dispatch(setLoading(true))
    try {
        const id = await PeerConnection.startPeerSession()
        const secret = getState().peer.secret
        PeerConnection.onIncomingConnection(async (conn) => {
            const peerId = conn.peer
            message.info("Incoming connection: " + peerId)
            dispatch(addConnectionList(peerId))
            PeerConnection.onConnectionDisconnected(peerId, () => {
                message.info("Connection closed: " + peerId)
                dispatch(removeConnectionList(peerId))
            })
            const key = await deriveKey(secret)
            PeerConnection.onConnectionReceiveData(peerId, key, async (data) => {
                if (data.dataType === DataType.FILE_META) {
                    const total = data.total || 0
                    const size = Number(data.message || '0')
                    const fileId = `${peerId}-${data.fileName}`
                    const received = {
                        id: fileId,
                        from: peerId,
                        fileName: data.fileName || 'fileName',
                        fileType: data.fileType || '',
                        size,
                        chunks: total,
                        received: 0,
                        ready: false
                    }
                    dispatch(addReceivedFile(received))
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
                        ready: true
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


