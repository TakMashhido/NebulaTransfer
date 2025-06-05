import {ConnectionActionType, ReceivedFile} from "./connectionTypes";
import {Dispatch} from "redux";
import {DataType, PeerConnection} from "../../helpers/peer";
import {message} from "antd";
import {cacheChunk} from "../../helpers/fileCache";
import {deriveKey} from "../../helpers/encryption";

export const changeConnectionInput = (id: string) => ({
    type: ConnectionActionType.CONNECTION_INPUT_CHANGE, id
})

export const setLoading = (loading: boolean) => ({
    type: ConnectionActionType.CONNECTION_CONNECT_LOADING, loading
})
export const addConnectionList = (id: string) => ({
    type: ConnectionActionType.CONNECTION_LIST_ADD, id
})

export const removeConnectionList = (id: string) => ({
    type: ConnectionActionType.CONNECTION_LIST_REMOVE, id
})

export const selectItem = (id: string) => ({
    type: ConnectionActionType.CONNECTION_ITEM_SELECT, id
})

export const addReceivedFile = (file: ReceivedFile) => ({
    type: ConnectionActionType.RECEIVED_FILE_ADD, file
})

export const updateFileProgress = (id: string, received: number) => ({
    type: ConnectionActionType.RECEIVED_FILE_PROGRESS, id, received
})

export const markFileReady = (id: string) => ({
    type: ConnectionActionType.RECEIVED_FILE_READY, id
})

export const connectPeer: (id: string) => (dispatch: Dispatch, getState: () => any) => Promise<void>
    = (id: string) => (async (dispatch, getState) => {
    dispatch(setLoading(true))
    try {
        await PeerConnection.connectPeer(id)
        PeerConnection.onConnectionDisconnected(id, () => {
            message.info("Connection closed: " + id)
            dispatch(removeConnectionList(id))
        })
        const secret = getState().peer.secret
        const key = await deriveKey(secret)
        PeerConnection.onConnectionReceiveData(id, key, async (data) => {
            if (data.dataType === DataType.FILE_META) {
                const total = data.total || 0
                const size = Number(data.message || '0')
                const fileId = `${id}-${data.fileName}`
                const received: ReceivedFile = {
                    id: fileId,
                    from: id,
                    fileName: data.fileName || 'fileName',
                    fileType: data.fileType || '',
                    size,
                    chunks: total,
                    received: 0,
                    ready: false
                }
                dispatch(addReceivedFile(received))
            } else if (data.dataType === DataType.FILE_CHUNK && data.chunk !== undefined && data.index !== undefined) {
                const fileId = `${id}-${data.fileName}`
                await cacheChunk(fileId, data.index, data.chunk)
                dispatch(updateFileProgress(fileId, data.index + 1))
            } else if (data.dataType === DataType.FILE_COMPLETE) {
                const fileId = `${id}-${data.fileName}`
                dispatch(markFileReady(fileId))
            } else if (data.dataType === DataType.FILE && data.file) {
                const fileId = `${id}-${data.fileName}`
                const received: ReceivedFile = {
                    id: fileId,
                    from: id,
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
        dispatch(addConnectionList(id))
        dispatch(setLoading(false))
    } catch (err) {
        dispatch(setLoading(false))
        console.log(err)
    }
})


