import {ConnectionActionType, ReceivedFile} from "./connectionTypes";
import {Dispatch} from "redux";
import {DataType, PeerConnection} from "../../helpers/peer";
import {message} from "antd";

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

export const connectPeer: (id: string) => (dispatch: Dispatch) => Promise<void>
    = (id: string) => (async (dispatch) => {
    dispatch(setLoading(true))
    try {
        await PeerConnection.connectPeer(id)
        PeerConnection.onConnectionDisconnected(id, () => {
            message.info("Connection closed: " + id)
            dispatch(removeConnectionList(id))
        })
        PeerConnection.onConnectionReceiveData(id, (file) => {
            message.info("Receiving file " + file.fileName + " from " + id)
            if (file.dataType === DataType.FILE && file.file) {
                const received: ReceivedFile = {
                    from: id,
                    file: file.file,
                    fileName: file.fileName || 'fileName',
                    fileType: file.fileType || ''
                }
                dispatch(addReceivedFile(received))
            }
        })
        dispatch(addConnectionList(id))
        dispatch(setLoading(false))
    } catch (err) {
        dispatch(setLoading(false))
        console.log(err)
    }
})


