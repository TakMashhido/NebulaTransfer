import Peer, {DataConnection, PeerErrorType, PeerError} from "peerjs";
import {message} from "antd";
import {encryptArrayBuffer, decryptArrayBuffer} from './encryption'

export enum DataType {
    FILE = 'FILE',
    OTHER = 'OTHER',
    FILE_META = 'FILE_META',
    FILE_CHUNK = 'FILE_CHUNK',
    FILE_COMPLETE = 'FILE_COMPLETE'

}
export interface Data {
    dataType: DataType
    file?: Blob
    chunk?: ArrayBuffer
    index?: number
    total?: number
    fileName?: string
    fileType?: string
    message?: string
}

let peer: Peer | undefined
let connectionMap: Map<string, DataConnection> = new Map<string, DataConnection>()

export const PeerConnection = {
    getPeer: () => peer,
    startPeerSession: () => new Promise<string>((resolve, reject) => {
        try {
            peer = new Peer()
            peer.on('open', (id) => {
                console.log('My ID: ' + id)
                resolve(id)
            }).on('error', (err) => {
                console.log(err)
                message.error(err.message)
            })
        } catch (err) {
            console.log(err)
            reject(err)
        }
    }),
    closePeerSession: () => new Promise<void>((resolve, reject) => {
        try {
            if (peer) {
                peer.destroy()
                peer = undefined
            }
            resolve()
        } catch (err) {
            console.log(err)
            reject(err)
        }
    }),
    connectPeer: (id: string) => new Promise<void>((resolve, reject) => {
        if (!peer) {
            reject(new Error("Peer doesn't start yet"))
            return
        }
        if (connectionMap.has(id)) {
            reject(new Error("Connection existed"))
            return
        }
        try {
            let conn = peer.connect(id, {reliable: true})
            if (!conn) {
                reject(new Error("Connection can't be established"))
            } else {
                conn.on('open', function() {
                    console.log("Connect to: " + id)
                    connectionMap.set(id, conn)
                    peer?.removeListener('error', handlePeerError)
                    resolve()
                }).on('error', function(err) {
                    console.log(err)
                    peer?.removeListener('error', handlePeerError)
                    reject(err)
                })

                // When the connection fails due to expiry, the error gets emmitted
                // to the peer instead of to the connection.
                // We need to handle this here to be able to fulfill the Promise.
                const handlePeerError = (err: PeerError<`${PeerErrorType}`>) => {
                    if (err.type === 'peer-unavailable') {
                        const messageSplit = err.message.split(' ')
                        const peerId = messageSplit[messageSplit.length - 1]
                        if (id === peerId) reject(err)
                    }
                }
                peer.on('error', handlePeerError);
            }
        } catch (err) {
            reject(err)
        }
    }),
    onIncomingConnection: (callback: (conn: DataConnection) => void) => {
        peer?.on('connection', function (conn) {
            console.log("Incoming connection: " + conn.peer)
            connectionMap.set(conn.peer, conn)
            callback(conn)
        });
    },
    onConnectionDisconnected: (id: string, callback: () => void) => {
        if (!peer) {
            throw new Error("Peer doesn't start yet")
        }
        if (!connectionMap.has(id)) {
            throw new Error("Connection didn't exist")
        }
        let conn = connectionMap.get(id);
        if (conn) {
            conn.on('close', function () {
                console.log("Connection closed: " + id)
                connectionMap.delete(id)
                callback()
            });
        }
    },
    sendConnection: (id: string, data: Data): Promise<void> => new Promise((resolve, reject) => {
        const conn = connectionMap.get(id);
        if (!conn || !conn.open) {
            reject(new Error("Connection didn't exist"))
            return
        }
        try {
            conn.send(data)
            resolve()
        } catch (err) {
            reject(err)
        }
    }),
    sendLargeFile: async (id: string, file: File, key: CryptoKey, chunkSize = 4 * 1024 * 1024) => {
        const total = Math.ceil(file.size / chunkSize)
        await PeerConnection.sendConnection(id, {
            dataType: DataType.FILE_META,
            fileName: file.name,
            fileType: file.type,
            total,
            message: `${file.size}`
        })
        for (let i = 0; i < total; i++) {
            const chunk = await file.slice(i * chunkSize, (i + 1) * chunkSize).arrayBuffer()
            const encrypted = await encryptArrayBuffer(chunk, key)
            await PeerConnection.sendConnection(id, {
                dataType: DataType.FILE_CHUNK,
                chunk: encrypted,
                index: i,
                total,
                fileName: file.name,
                fileType: file.type
            })
        }
        await PeerConnection.sendConnection(id, {
            dataType: DataType.FILE_COMPLETE,
            fileName: file.name
        })
    },
    onConnectionReceiveData: (id: string, key: CryptoKey, callback: (f: Data) => void) => {
        if (!peer) {
            throw new Error("Peer doesn't start yet")
        }
        if (!connectionMap.has(id)) {
            throw new Error("Connection didn't exist")
        }
        let conn = connectionMap.get(id)
        if (conn) {
            conn.on('data', async function (receivedData) {
                console.log("Receiving data from " + id)
                let data = receivedData as Data
                if (data.dataType === DataType.FILE_CHUNK && data.chunk) {
                    const decrypted = await decryptArrayBuffer(data.chunk, key)
                    data = {...data, chunk: decrypted}
                }
                callback(data)
            })
        }
    }

}