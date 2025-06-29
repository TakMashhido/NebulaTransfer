export enum ConnectionActionType {
    CONNECTION_INPUT_CHANGE = 'CONNECTION_INPUT_CHANGE',
    CONNECTION_CONNECT_LOADING = 'CONNECTION_CONNECT_LOADING',
    CONNECTION_LIST_ADD = 'CONNECTION_LIST_ADD',
    CONNECTION_LIST_REMOVE = 'CONNECTION_LIST_REMOVE',
    CONNECTION_ITEM_SELECT = 'CONNECTION_ITEM_SELECT',
    RECEIVED_FILE_ADD = 'RECEIVED_FILE_ADD',
    RECEIVED_FILE_PROGRESS = 'RECEIVED_FILE_PROGRESS',
    RECEIVED_FILE_READY = 'RECEIVED_FILE_READY',
    RECEIVED_FILE_START = 'RECEIVED_FILE_START',
    RECEIVED_FILE_STATS_UPDATE = 'RECEIVED_FILE_STATS_UPDATE', // New action type
    CLEAR_RECEIVED_FILES = 'CLEAR_RECEIVED_FILES' // Action to clear all received files
}

export interface ConnectionState {
    readonly id?: string
    readonly loading: boolean
    readonly list: string[]
    readonly selectedId?: string
    readonly receivedFiles: ReceivedFile[]
}

export interface ReceivedFile {
    readonly id: string
    readonly from: string
    readonly fileName: string
    readonly fileType: string
    readonly size: number
    readonly chunks: number
    readonly received: number
    readonly ready: boolean
    readonly startTime?: number
    readonly averageSpeed?: number // New field
    readonly totalTime?: number    // New field
}
