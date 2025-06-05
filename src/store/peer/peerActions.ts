import {PeerActionType} from "./peerTypes";
import {Dispatch} from "redux";
import {DataType, PeerConnection} from "../../helpers/peer";
import {message} from "antd";
import {addConnectionList, removeConnectionList, addReceivedFile} from "../connection/connectionActions";

export const startPeerSession = (id: string) => ({
    type: PeerActionType.PEER_SESSION_START, id
})

export const stopPeerSession = () => ({
    type: PeerActionType.PEER_SESSION_STOP,
})
export const setLoading = (loading: boolean) => ({
    type: PeerActionType.PEER_LOADING, loading
})

export const startPeer: () => (dispatch: Dispatch) => Promise<void>
    = () => (async (dispatch) => {
    dispatch(setLoading(true))
    try {
        const id = await PeerConnection.startPeerSession()
        PeerConnection.onIncomingConnection((conn) => {
            const peerId = conn.peer
            message.info("Incoming connection: " + peerId)
            dispatch(addConnectionList(peerId))
            PeerConnection.onConnectionDisconnected(peerId, () => {
                message.info("Connection closed: " + peerId)
                dispatch(removeConnectionList(peerId))
            })
            PeerConnection.onConnectionReceiveData(peerId, (file) => {
                message.info("Receiving file " + file.fileName + " from " + peerId)
                if (file.dataType === DataType.FILE && file.file) {
                    const received = {
                        from: peerId,
                        file: file.file,
                        fileName: file.fileName || 'fileName',
                        fileType: file.fileType || ''
                    }
                    dispatch(addReceivedFile(received))
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


